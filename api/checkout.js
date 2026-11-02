// Checkout is intentionally disabled. Minecraft's Java Edition EULA prohibits
// selling or monetizing Java mods. Do not enable paid mod access without
// explicit authorization and an appropriate independent compliance review.
export default function handler(req,res){res.setHeader('Cache-Control','no-store');res.status(503).json({error:'Paid access is not available. RIMVISUALS is not currently selling mod subscriptions.'});}
