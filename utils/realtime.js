let db;
let FieldValue;

try {
    const firebase = require('../config/firebase');
    db = firebase.db;
    FieldValue = firebase.FieldValue;
} catch (err) {
    console.warn('Firebase not configured, realtime features disabled');
}

const broadcastEvaluationUpdate = async (tenderId, data) => {
    if (!db) {
        console.warn('Firestore not available');
        return;
    }

    try {
        await db.collection('scoring_live').doc(tenderId).collection('updates').add({
            ...data,
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Failed to broadcast to Firestore:', err.message);
        throw err;
    }
};

const sendNotification = async (tenderId, message) => {
    if (!db) {
        console.warn('Firestore not available');
        return;
    }

    try {
        await db.collection('notifications').add({
            tenderId,
            message,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Failed to send notification:', err.message);
        throw err;
    }
};

const updateLiveScoring = async (tenderId, bidderId, section, avgScore, evaluatorCount) => {
    if (!db) {
        console.warn('Firestore not available');
        return;
    }

    try {
        const docRef = db.collection('scoring_live').doc(tenderId);
        await docRef.collection('updates').add({
            type: 'live_score_update',
            bidderId,
            section,
            avgScore,
            evaluatorCount,
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Failed to update live scoring:', err.message);
    }
};

module.exports = {
    broadcastEvaluationUpdate,
    sendNotification,
    updateLiveScoring
};
