export class VideoEventTarget implements EventTarget {
    createDelegate(): void {
        if(!this["listeners"]) {
            this["listeners"] = new Map();
        }
    }
    On(type, listener): void {
        this.addEventListener.call(this, type, listener);
    }
    Off(type, listener): void {
        this.removeEventListener.call(this, type, listener);
    }
    addEventListener(type, listener): void {
        this.createDelegate();
        var listeners = this["listeners"].get(type);
        if(!listeners){
            listeners = new Set();
            this["listeners"].set(type, listeners);
        }
        listeners.add(listener);
    }
  
    dispatchEvent(event: CustomEvent): boolean {
        this.createDelegate();
        var listeners = this["listeners"].get(event.type);
        if(listeners){
          for (const value of listeners) {
              value(event);
          }
        }
        return true;
    }
  
    removeEventListener(type, listener): void {
        this.createDelegate();
        var listeners = this["listeners"].get(type);
        if(listeners){
            listeners.delete(listener);
            if(listeners.size === 0){
                this["listeners"].delete(type);
            }
        }
    }
    removeAllEventListeners(): void {
        this.createDelegate();
        if(!this["listeners"]) {
            this["listeners"].clear();
        }
    }
  }