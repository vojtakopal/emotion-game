const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const likelihoodMapping = {
    UNKNOWN: 0,
    VERY_UNLIKELY: 0,
    UNLIKELY: 0.25,
    POSSIBLE: 0.5,
    LIKELY: 0.75,
    VERY_LIKELY: 1,
};

const likelihoodTypes = [
    'joyLikelihood',
    'angerLikelihood',
    'sorrowLikelihood',
    'surpriseLikelihood',
];

const isEmptyLikelihood = likelihood => Object.values(likelihood).reduce((a, b) => Math.max(a, b), 0) === 0;

const withApp = createPromise => {
    const appOptions = JSON.parse(process.env.FIREBASE_CONFIG);
    const app = admin.initializeApp(appOptions, 'app');
    
    const deleteApp = () => app.delete().catch(() => null);

    return createPromise(app)
        .then(() => deleteApp())
        .catch(e => {
            deleteApp();
            throw e;
        });
};

const setTimeoutPromise = (callback, timeout) => new Promise((resolve, reject) => {
    try {
        resolve(callback());
    } catch (e) {
        reject(e);
    }
});

exports.handleShotUploaded = functions.storage.object().onFinalize(object => {
    const imageUri = `gs://${object.bucket}/${object.name}`;
    return withApp(app => client
        .faceDetection({ image: { source: { imageUri } } })
        .then(results => {
            const [face] = results[0].faceAnnotations;
            if (!face) {
                return;
            }

            const likelihood = likelihoodTypes.reduce((l, type) => ({ ...l, [type]: likelihoodMapping[face[type]] }), {});
            if (isEmptyLikelihood(likelihood)) {
                return;
            }

            const entry = app.database().ref('/progress').push();
            return entry.set(likelihood);
        })
    );
});

const numOfRandomChangesPerMinute = 10;
const randomChangeToProgress = db => new Promise(resolve => db.ref('/game')
    .once('value', snapshot => {
        const game = snapshot.val();
        if (!game || !game.isRunning) {
            resolve();
            return;
        }

        const entry = db.ref('/progress').push();
        entry.set({
            joyLikelihood: -Math.random()*0.5,
            angerLikelihood: -Math.random()*0.5,
            sorrowLikelihood: -Math.random()*0.5,
            surpriseLikelihood: -Math.random()*0.5
        });
        resolve();
    })
);

exports.everyMinute = functions.pubsub
    .topic('every-minute')
    .onPublish(() => withApp(app => Promise.all(
        Array(numOfRandomChangesPerMinute).fill(0).map(
            () => setTimeoutPromise(() => randomChangeToProgress(app.database()), Math.floor(Math.random() * 1000 * 60))
        ),
    )));
