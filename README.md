Testing guide

The app is deployed in S3 bucket. Here is the link: http://chat-app-hackathon.s3-website-us-east-1.amazonaws.com/
You will have to open two same tabs with different names. Names can be entered in the prompt, first time when you open a website.
Then you will be given with a warning each time you are abusive online, upto 3 times -- On third warning you will be exclusively banned.
The first two warnings would be determined by a border color around the profile image at the top right corner of a page.You can see them after refreshing.


Lambda_sdk.js file is a backend code stored in aws lambda that connects s3 bucket to dynamodb via API Gatway to fetch data.

