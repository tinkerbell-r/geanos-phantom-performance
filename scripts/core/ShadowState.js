/**
 * Manages runtime-only state for potentially Phantomized documents.
 * Ensures no flags are written to the database.
 */
export class ShadowState {
    /** @type {WeakMap<Document, boolean>} */
    static _phantoms = new WeakMap();

    /** @type {WeakMap<Document, number>} */
    static _lastActive = new WeakMap();

    /**
     * Mark a document as a Phantom.
     * @param {Document} doc 
     */
    static mark(doc) {
        this._phantoms.set(doc, true);
    }

    /**
     * Unmark a document.
     * @param {Document} doc 
     */
    static unmark(doc) {
        this._phantoms.delete(doc);
    }

    /**
     * Check if a document is a Phantom.
     * @param {Document} doc 
     */
    static isPhantom(doc) {
        return this._phantoms.has(doc);
    }

    /**
     * Update activity timestamp.
     * @param {Document} doc 
     */
    static touch(doc) {
        this._lastActive.set(doc, Date.now());
    }

    /**
     * Get last activity timestamp.
     * @param {Document} doc 
     * @returns {number}
     */
    static getLastActive(doc) {
        return this._lastActive.get(doc) || 0;
    }
}
