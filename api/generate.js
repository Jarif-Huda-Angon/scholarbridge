// api/generate.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

// 1. Initialize Firebase Admin with a more robust "ES Module" check
if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // The replace handles the specific way Vercel stores newline characters
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    // Only accept secure POST requests
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, systemPrompt, uid } = req.body;

    if (!uid) return res.status(401).json({ error: 'Unauthorized: No User ID provided.' });

    try {
        // 2. Look up the user's profile
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        let tier = 'free';
        let draftsUsed = 0;

        if (userDoc.exists) {
            const data = userDoc.data();
            tier = data.tier || 'free';
            draftsUsed = data.drafts_used_this_week || 0;
        } else {
            // First-time setup for new commanders
            await userRef.set({ tier: 'free', drafts_used_this_week: 0, email: "New Commander" });
        }

        // 3. Freemium Guard
        if (tier === 'free' && draftsUsed >= 10) {
            return res.status(403).json({ error: 'LIMIT_REACHED' });
        }

        // 4. Model Router (Flash for Free, Pro for Paid)
        const modelName = tier === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.0-flash';;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_SECRET_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
        });

        const textResponse = result.response.text();

        // 5. Update Quota
        if (tier === 'free') {
            await userRef.update({
                drafts_used_this_week: admin.firestore.FieldValue.increment(1)
            });
        }

        return res.status(200).json({ text: textResponse });

    } catch (error) {
        console.error("Critical Backend Error:", error);
        // Send a structured JSON error instead of letting Vercel send an HTML page
        return res.status(500).json({ error: 'AI_REBOOT_FAILED', message: error.message });
    }
}