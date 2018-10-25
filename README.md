# emotion-game
Demo of using Google Vision API, Firebase (Realtime Database, Functions, Storage) and AppEngine with PubSub.

You need to have GCloud project and Firebase project. Ideally use the same gcloud project also in Firebase.
You need to have Firebase CLI and GCloud SDK installed. 
Login to both: `firebase login`, `gcloud login`
You need to enable Google Cloud PubSub and Vision API.

## Get it running

```
npm install # install root project dependencies

gcloud config set project devfest-workshop # assign gcloud project 

# setup cron in appengine
cd ./appengine
npm install
gcloud app create # you need to create the app in gcloud
npm run deploy # and deploy
```

Create your Firebase project. https://console.firebase.google.com

```
# setup firebase functions
cd functions/
npm install
cd ..
firebase deploy --project devfest-workshop # deploy it all: hosting, functions
```

Enable anonymous auth in Firebase project

Create empty realtime database and redeploy rules by
`firebase deploy --project devfest-workshop --only database`

Create empty storage in Firebase project and redeploy rules by
`firebase deploy --project devfest-workshop --only storage`


Enable google vision api
https://console.developers.google.com/apis/api/vision.googleapis.com/overview?project=283864236122

## TODO

 * [ ] Improve README instructions
 * [ ] Add some styling
