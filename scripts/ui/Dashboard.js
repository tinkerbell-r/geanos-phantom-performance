/**
 * GPP Dashboard
 * Displays metrics and controls for Granos Phantom Performance.
 */
import { GPP } from "../main.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class GPPDashboard extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "gpp-dashboard",
        tag: "form",
        window: {
            title: "Geano's Phantom Performance",
            icon: "fas fa-ghost",
            resizable: true
        },
        position: {
            width: 400,
            height: "auto"
        },
    };

    static PARTS = {
        main: {
            template: "modules/geanos-phantom-performance/templates/dashboard.hbs",
        }
    };

    async _prepareContext(options) {
        // Calculate Metrics
        const actors = game.actors.contents;
        const phantomActors = actors.filter(a => GPP.storage.isPhantom(a));
        const scenes = game.scenes.contents;
        const phantomScenes = scenes.filter(s => GPP.sceneStorage.isPhantom(s));

        // Estimates (very rough heuristic)
        // Full Actor ~ 50KB, Skeleton ~ 2KB => Save 48KB
        // Full Scene (walls/lights) ~ 200KB+, Skeleton ~ 5KB => Save 195KB

        const actorSavingsCheck = (phantomActors.length * 48); // KB
        const sceneSavingsCheck = (phantomScenes.length * 195); // KB
        const totalSavingsKB = Math.round(actorSavingsCheck + sceneSavingsCheck);
        const totalSavingsMB = (totalSavingsKB / 1024).toFixed(2);

        // Memory Score (Fun metric)
        const totalItems = actors.length + scenes.length;
        const phantomItems = phantomActors.length + phantomScenes.length;
        const efficiency = totalItems > 0 ? Math.round((phantomItems / totalItems) * 100) : 0;

        return {
            metrics: {
                totalPhantoms: phantomItems,
                actorPhantoms: phantomActors.length,
                scenePhantoms: phantomScenes.length,
                savings: totalSavingsMB + " MB",
                efficiency: efficiency
            }
        };
    }
}
