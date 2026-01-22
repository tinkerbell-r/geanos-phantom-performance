/**
 * Installs Proxies and Wrappers to detect access to Phantom data.
 */
import { GPP } from "../main.js";
import { ShadowState } from "./ShadowState.js";

export class SmartProxy {

    static initialize() {
        console.log("GPP | Initializing Smart Proxy hooks...");
        SmartProxy.wrapActorPreparation();
    }

    static wrapActorPreparation() {
        // Use CONFIG.Actor.documentClass because game.actors is not ready in 'init'
        const ActorClass = CONFIG.Actor.documentClass;

        // 1. Wrap prepareEmbeddedDocuments to Proxy collections safely
        const originalPrepareEmbeddedDocuments = ActorClass.prototype.prepareEmbeddedDocuments;
        ActorClass.prototype.prepareEmbeddedDocuments = function () {
            originalPrepareEmbeddedDocuments.apply(this, arguments);

            if (ShadowState.isPhantom(this)) {
                // Wrap the collections on the instance
                SmartProxy.wrapCollectionInstance(this, this.items, 'items');
                SmartProxy.wrapCollectionInstance(this, this.effects, 'effects');
            }
        };

        // 2. Wrap prepareData to proxy 'system'
        const originalPrepareData = ActorClass.prototype.prepareData;
        ActorClass.prototype.prepareData = function () {
            originalPrepareData.apply(this, arguments);

            if (ShadowState.isPhantom(this)) {
                // Wrap 'system' with a Proxy that handles auto-hydration
                this.system = new Proxy(this.system, SmartProxy.createSystemHandler(this));
            }
        };

        // 3a. CRITICAL: Hook toObject to prevention Saving Skeletons
        const originalToObject = ActorClass.prototype.toObject;
        ActorClass.prototype.toObject = function (source = true) {
            if (ShadowState.isPhantom(this)) {
                GPP.storage.swapInSync(this);
            }
            return originalToObject.apply(this, arguments);
        };

        // 3b. ULTRA-CRITICAL: Hook toJSON for JSON.stringify protection
        // toJSON is called by JSON.stringify(). If we don't catch this, 
        // stringifying the actor manually creates a skeleton string.
        const originalToJSON = ActorClass.prototype.toJSON;
        ActorClass.prototype.toJSON = function () {
            // Note: toJSON usually delegates to toObject, but some Systems/Modules override it.
            // We catch it here to be absolutely safe.
            if (ShadowState.isPhantom(this)) {
                GPP.storage.swapInSync(this);
            }
            return originalToJSON.apply(this, arguments);
        };

        // 4. Bypass System-Specific Logic for Phantoms
        const originalPrepareDerivedData = ActorClass.prototype.prepareDerivedData;
        ActorClass.prototype.prepareDerivedData = function () {
            if (ShadowState.isPhantom(this)) {
                return;
            }
            return originalPrepareDerivedData.apply(this, arguments);
        };
    }

    /**
     * Wraps specific methods of a Collection instance to trigger hydration.
     * @param {Actor} actor
     * @param {Collection} collection
     * @param {string} collectionName - 'items' or 'effects'
     */
    static wrapCollectionInstance(actor, collection, collectionName) {
        if (!collection) return;

        const methodsToCheck = ['get', 'find', 'filter', 'forEach', 'map', 'reduce', 'some', 'every'];

        for (const method of methodsToCheck) {
            const original = collection[method];
            if (typeof original === 'function') {
                collection[method] = function (...args) {
                    // 1. Initial check: Is it still a phantom?
                    if (ShadowState.isPhantom(actor)) {
                        GPP.storage.swapInSync(actor);

                        // 2. REDIRECT: Use the NEW collection on the actor
                        const newCollection = actor[collectionName];
                        if (newCollection && typeof newCollection[method] === 'function') {
                            return newCollection[method](...args);
                        }
                    }
                    return original.apply(this, arguments);
                };
            }
        }
    }

    /**
     * Handler for Actor.system
     */
    static createSystemHandler(actor) {
        return {
            get(target, prop, receiver) {
                if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);

                if (ShadowState.isPhantom(actor)) {
                    GPP.storage.swapInSync(actor);
                    return Reflect.get(actor.system, prop);
                }

                return Reflect.get(target, prop, receiver);
            },

            set(target, prop, value, receiver) {
                if (ShadowState.isPhantom(actor)) {
                    GPP.storage.swapInSync(actor);
                    return Reflect.set(actor.system, prop, value);
                }
                return Reflect.set(target, prop, value, receiver);
            }
        };
    }
}
