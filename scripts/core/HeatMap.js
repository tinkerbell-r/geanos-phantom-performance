/**
 * Tracks actor activity and manages the "Decay" process.
 */
import { GPP } from "../main.js";

export class HeatMap {
    static IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    static CHECK_INTERVAL_MS = 5 * 60 * 1000;  // Check every 5 minutes

    constructor() {
        this.runLoop = null;
    }

    start() {
        console.log("GPP | Initializing Heat Map...");

        // 1. Hooks for Activity
        Hooks.on("controlToken", (token, controlled) => {
            if (controlled && token.actor) this.touch(token.actor);
        });

        Hooks.on("updateActor", (actor) => {
            this.touch(actor);
        });

        Hooks.on("updateItem", (item) => {
            if (item.parent) this.touch(item.parent);
        });

        // 2. Start Decay Loop
        this.runLoop = setInterval(() => this.processDecay(), HeatMap.CHECK_INTERVAL_MS);
    }

    /**
     * Mark an actor as active.
     */
    async touch(actor) {
        if (!actor) return;

        // If it's a phantom, hydration is handled by SmartProxy or direct access.
        // We just update the timestamp.
        const now = Date.now();

        // Avoid spamming updates to flags if recently touched (debounce 10s)
        const last = actor.getFlag("geanos-phantom-performance", "lastActive") || 0;
        if (now - last < 10000) return;

        await actor.setFlag("geanos-phantom-performance", "lastActive", now);
    }

    /**
     * Scan for inactive actors and Phantomize them.
     */
    async processDecay() {
        if (!game.user.isGM) return; // Only GM manages lifecycle

        console.log("GPP | Running Heat Map Decay...");
        const now = Date.now();

        const candidates = game.actors.filter(actor => {
            // SKIP CONDITIONS
            if (actor.getFlag("geanos-phantom-performance", "isPhantom")) return false; // Already phantom
            if (actor.hasPlayerOwner) return false; // Player character
            if (actor.sheet?.rendered) return false; // GM is looking at it
            if (game.combat?.combatants.some(c => c.actorId === actor.id)) return false; // In combat

            // AGE CHECK
            const lastActive = actor.getFlag("geanos-phantom-performance", "lastActive") || 0;
            return (now - lastActive) > HeatMap.IDLE_THRESHOLD_MS;
        });

        if (candidates.length === 0) return;

        console.log(`GPP | Found ${candidates.length} inactive actors. Phantomizing...`);
        ui.notifications.info(`GPP: Cleaning up ${candidates.length} inactive actors...`);

        // Process sequentially to avoid DB lockups
        for (const actor of candidates) {
            await GPP.swapOut(actor);
        }
    }
}
