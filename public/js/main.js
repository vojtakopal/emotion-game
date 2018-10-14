const likelihoodTypes = [
    'joyLikelihood',
    'angerLikelihood',
    'sorrowLikelihood',
    'surpriseLikelihood',
];

const defaultWidth = 320;

const valuesToKeys = (defaultValue, values) => values.reduce(( obj, type ) => ({ ...obj, [type]: defaultValue }), {});
const uuidv4 = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
);
const to2D = val => (val < 10) ? `0${val}` : val;
const getDateTimeString = () => {
    const d = new Date();
    return `${d.getFullYear()}${to2D(d.getMonth()+1)}${to2D(d.getDate())}${to2D(d.getHours())}${to2D(d.getMinutes())}`;
}

const startWebcam = ({ video, canvas }) => navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
}).then(stream => {
    try {
        video.srcObject = stream;
    } catch (error) {
        video.src = window.URL.createObjectURL(stream);
    }
    video.addEventListener('canplay', () => {
        if (!video.playing) {
            height = video.videoHeight / (video.videoWidth/defaultWidth);
            video.setAttribute('width', defaultWidth);
            video.setAttribute('height', height);
            canvas.setAttribute('width', defaultWidth);
            canvas.setAttribute('height', height);
        }
    }, false);
}).catch(err => {
    console.log("An error occured!" + err);
});

const getSnapshot = ({ video, canvas }) => {
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width,  canvas.height);
    return canvas.toDataURL('image/png');
};

const uploadToStorage = base64EncodedImage => {
    const storageRef = firebase.storage().ref();
    return storageRef
        .child(`images/${getDateTimeString()}/${uuidv4()}.png`)
        .putString(base64EncodedImage, 'data_url')
        .then(snapshot => {
            const { metadata } = snapshot;
            return metadata.fullPath;
        });
};

const listenToEmotions = updateUI => firebase.database()
    .ref('/progress')
    .on('value', snapshot => {
        const progress = snapshot.val();
        const currentState = Object
            .values(progress)
            .reduce(
                (accResult, item) => likelihoodTypes.reduce(
                    (obj, type) => ({ ...obj, [type]: accResult[type] + item[type] }),
                    {},
                ), 
                valuesToKeys(0, likelihoodTypes),
            );

        updateUI(currentState);
    });

const signIn = () => firebase.auth().signInAnonymously();

(($, $container) => {

    let timeCounter = 0;
    const secondsBetweenSnaps = 5;
    const $video = $('<video autoplay playsinline muted></video>');
    const $canvas = $('<canvas />').hide();
    const $counter = $('<h1></h1>');
    const $histogram = $('<pre></pre>');

    const $startButton = $('<button>Start game</button>')
        .on('click', () => signIn()
            .then(() => {
                const canvas = $canvas.get(0);
                const video = $video.get(0);
                video.play();
                $startButton.hide();
                setInterval(() => {
                    timeCounter = (timeCounter + 1) % secondsBetweenSnaps;
                    const countDown = secondsBetweenSnaps - timeCounter - 1;
                    $counter.text(countDown || 'Snap!');
                    if (timeCounter === 0) {
                        const base64EncodedImage = getSnapshot({ video, canvas });
                        uploadToStorage(base64EncodedImage);
                    }
                }, 1000);
                listenToEmotions(update => {
                    $histogram.text(JSON.stringify(update, null, '\t'));
                });
            })
        );

    $container
        .append($counter)
        .append($video)
        .append($canvas)
        .append($startButton)
        .append($histogram);

    $(() => {
        const canvas = $canvas.get(0);
        const video = $video.get(0);

        startWebcam({
            video,
            canvas,
        });
    });

})(jQuery, jQuery('#app'));