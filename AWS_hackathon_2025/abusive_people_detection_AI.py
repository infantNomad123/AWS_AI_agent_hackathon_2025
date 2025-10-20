import boto3
import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F


# -------------------------------
# 1. CONFIGURATION
# -------------------------------
DYNAMODB_TABLE = "Users"
REGION = "us-east-1"
MODEL_NAME = "unitary/toxic-bert"
# OUTPUT_BUCKET was not present in the first version


# -------------------------------
# 2. FETCH DATA FROM DYNAMODB
# -------------------------------
def fetch_messages(table_name, region):
    print("Fetching messages from DynamoDB...")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    response = table.scan()
    items = response.get("Items", [])

    if not items:
        raise Exception("No messages found in DynamoDB table.")

    df = pd.DataFrame(items)
    if "message" not in df.columns:
        raise Exception("'message' field not found in DynamoDB items.")

    df["message"] = df["message"].astype(str)
    print(f"Retrieved {len(df)} messages.\n")
    return df, table


# -------------------------------
# 3. LOAD THREAT/ABUSE DETECTION MODEL
# -------------------------------
def load_model(model_name):
    print("Loading threat/abuse detection model...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.eval()  # set to evaluation mode
    return tokenizer, model


# -------------------------------
# 4. ANALYZE MESSAGES
# -------------------------------
def analyze_message(model, tokenizer, text, threshold=0.5):
    inputs = tokenizer(text[:512], return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits
    probs = torch.sigmoid(logits).squeeze().tolist()  # multi-label probs

    if isinstance(probs, float):  # Handle single-value tensors
        probs = [probs]

    labels = model.config.id2label
    # Pick all labels above threshold
    toxic_labels = [labels[i] for i, p in enumerate(probs) if p >= threshold]

    # Determine if message is considered "toxic" or "safe"
    is_toxic = len(toxic_labels) > 0
    label = "toxic" if is_toxic else "safe"

    # Threat score = max probability among toxic classes
    threat_score = max(probs) if probs else 0.0

    return label, round(threat_score, 4)


def analyze_dataframe(df, model, tokenizer):
    print("Analyzing messages...")
    results = []
    for idx, row in df.iterrows():
        message = row["message"]
        user_id = row.get("userId", f"User_{idx}")

        if not message.strip():
            continue

        try:
            label, score = analyze_message(model, tokenizer, message)
            results.append({
                "userId": user_id,
                "message": message,
                "label": label,
                "score": score
            })
        except Exception as e:
            print(f"Error analyzing message from {user_id}: {e}")
    return pd.DataFrame(results)


# -------------------------------
# 5. SAVE RESULTS
# -------------------------------
def save_results(results_df, filename="dynamodb_threat_analysis.csv"):
    print("\n=== Sample Analysis Results ===")
    print(results_df.head(10))
    results_df.to_csv(filename, index=False)
    print(f"\nResults saved to local file: '{filename}'")


# -------------------------------
# 6. OPTIONAL: UPDATE DYNAMODB
# -------------------------------
def update_dynamodb(table, results_df):
    # This block was commented out in the initial version to prompt the user
    # '''if choice != "y":
    #     print("Skipped updating DynamoDB.")
    #     return'''

    print("Updating DynamoDB items with analysis results...")
    for _, row in results_df.iterrows():
        try:
            # NOTE: Assumes 'userId' is the primary key.
            table.update_item(
                Key={"userId": row["userId"]},
                UpdateExpression="SET #label = :label, threat_score = :score",
                ExpressionAttributeNames={"#label": "label"},
                ExpressionAttributeValues={":label": row["label"], ":score": str(row["score"])}
            )
        except Exception as e:
            print(f"Could not update {row['userId']}: {e}")
    print("DynamoDB table updated successfully.")


# -------------------------------
# MAIN EXECUTION
# -------------------------------
if __name__ == "__main__":
    try:
        df, table = fetch_messages(DYNAMODB_TABLE, REGION)
        tokenizer, model = load_model(MODEL_NAME)
        results_df = analyze_dataframe(df, model, tokenizer)
        save_results(results_df)
        update_dynamodb(table, results_df)
    except Exception as e:
        print(f"An error occurred during execution: {e}")
        
