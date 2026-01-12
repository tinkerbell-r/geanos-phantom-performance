/**
 * Geano's Phantom Performance
 * "Solving the Sidebar-Data-Dilemma"
 */

// Imports
import { PhantomStorage } from "./core/PhantomStorage.js";
import { SmartProxy } from "./core/SmartProxy.js";
import { HeatMap } from "./core/HeatMap.js";
import { SceneIntegration } from "./core/SceneIntegration.js";
// Phase 5 Imports
import { ScenePhantomStorage } from "./core/ScenePhantomStorage.js";
import { SceneProxy } from "./core/SceneProxy.js";
import { SceneHeatMap } from "./core/SceneHeatMap.js";
// Phase 6 Imports
import { Exorcist } from "./lib/Exorcist.js";
import { GPPDashboard } from "./ui/Dashboard.js";
import { Settings } from "./core/Settings.js";

// Global Instance
export let GPP = null; // Used by other modules

Hooks.once("init", () => {
    console.log("Geano's Phantom Performance | Initializing...");

    // Register Settings
    Settings.init();

    // Core GPP Object
    window.GPP = {
        storage: new PhantomStorage(),
        sceneStorage: new ScenePhantomStorage(),

        swapOut: async (actor) => window.GPP.storage.swapOut(actor),
        swapIn: async (actor) => window.GPP.storage.swapIn(actor),

        // Scene Shortcuts
        swapOutScene: async (scene) => window.GPP.sceneStorage.swapOut(scene),
        swapInScene: async (scene) => window.GPP.sceneStorage.swapIn(scene),

        // Phase 6
        exorcise: async () => Exorcist.performExorcism(),
        dashboard: () => new GPPDashboard().render(true, { focus: true })
    };

    // Assign exported GPP (for internal module use if needed, basically alias to window.GPP)
    GPP = window.GPP;

    // Proxies
    SmartProxy.initialize();
    SceneProxy.initialize(); // NEW
});

Hooks.once("ready", async () => {
    console.log("Geano's Phantom Performance | Ready.");

    // Initialize Compendiums
    await window.GPP.storage.initialize();
    await window.GPP.sceneStorage.initialize(); // NEW

    // Start Loops
    const heatMap = new HeatMap();
    heatMap.start();

    const sceneHeatMap = new SceneHeatMap(); // NEW
    sceneHeatMap.start();

    // Scene Pre-fetch logic for Actors
    const sceneInt = new SceneIntegration();
    sceneInt.start();

    // Initial "Aggressive" Scan (First Run Experience)
    // Runs 5 seconds after ready to let the world settle, then cleans up everything cold.
    setTimeout(async () => {
        const phantomsBefore = game.actors.filter(a => GPP.storage.isPhantom(a)).length;
        if (phantomsBefore === 0) {
            console.log("GPP | Performing Initial Scan...");
            // We don't await these to not block the main thread, 
            // but we want them to run.
            await heatMap.processDecay();
            await sceneHeatMap.processDecay();

            // Check results for the "Wow" factor
            const phantomsAfter = game.actors.filter(a => GPP.storage.isPhantom(a)).length;
            if (phantomsAfter > 0) {
                ui.notifications.info(`GPP: Initial Scan Complete. Optimized ${phantomsAfter} entities.`);
            }
        }
    }, 5000);
});
