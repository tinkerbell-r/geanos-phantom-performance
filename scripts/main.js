/**
 * Geano's Phantom Performance
 * "Solving the Sidebar-Data-Dilemma"
 */

// Imports
import { GPP } from "./api/GPP.js";
import { SmartProxy } from "./core/SmartProxy.js";
import { HeatMap } from "./core/HeatMap.js";
import { SceneIntegration } from "./core/SceneIntegration.js";
// Phase 5 Imports
import { SceneProxy } from "./core/SceneProxy.js";
import { SceneHeatMap } from "./core/SceneHeatMap.js";
// Phase 6 Imports
import { Settings } from "./core/Settings.js";

// Re-export GPP for other modules to import only if they desire strict typing, 
// though window.GPP is the preferred method for loose coupling.
export { GPP };

Hooks.once("init", () => {
    console.log("Geano's Phantom Performance | Initializing...");

    // Register Settings
    Settings.init();

    // Initialize Core Systems (Instances)
    GPP.init();

    // Expose Global API (Immediately)
    window.GPP = GPP;

    // Proxies
    SmartProxy.initialize();
    SceneProxy.initialize(); // NEW
});

Hooks.once("ready", async () => {
    console.log("Geano's Phantom Performance | Ready.");

    // Connect to Database (Now Synchronous, but keeping method for compatibility/verification)
    GPP.connect();

    // Start Loops
    const heatMap = new HeatMap();
    heatMap.start();

    const sceneHeatMap = new SceneHeatMap(); // NEW
    sceneHeatMap.start();

    // Scene Pre-fetch logic for Actors
    const sceneInt = new SceneIntegration();
    sceneInt.start();

    // CLEANUP HOOKS (Memory Leak Prevention)
    Hooks.on("deleteActor", (actor) => {
        if (GPP.storage) {
            import("./core/ShadowBuffer.js").then(({ ShadowBuffer }) => {
                if (ShadowBuffer.has(actor)) {
                    // console.log(`GPP | Cleaning up shadow memory for deleted Actor: ${actor.name}`);
                    ShadowBuffer.delete(actor);
                }
            });
            import("./core/ShadowState.js").then(({ ShadowState }) => {
                ShadowState.unmark(actor);
            });
        }
    });

    Hooks.on("deleteScene", (scene) => {
        if (GPP.sceneStorage) {
            import("./core/ShadowBuffer.js").then(({ ShadowBuffer }) => {
                if (ShadowBuffer.has(scene)) {
                    // console.log(`GPP | Cleaning up shadow memory for deleted Scene: ${scene.name}`);
                    ShadowBuffer.delete(scene);
                }
            });
            import("./core/ShadowState.js").then(({ ShadowState }) => {
                ShadowState.unmark(scene);
            });
        }
    });

    // Initial "Aggressive" Scan
    setTimeout(async () => {
        // v2 Refactor: Actors are phantomized in RAM only.
        // On first load, nothing is a phantom yet.
        // We run decay to populate the ShadowBuffer.
        console.log("GPP | Performing Initial RAM Optimization Scan...");

        await heatMap.processDecay();
        await sceneHeatMap.processDecay();

        const phantomsAfter = game.actors.filter(a => GPP.storage.isPhantom(a)).length;
        if (phantomsAfter > 0) {
            ui.notifications.info(`GPP: RAM Optimization Complete. ${phantomsAfter} entities shadowed.`);
        }
    }, 5000);
});
