import { BasePlayer } from "./base-player";
declare let BS: any;

export class BrowserPlayer extends BasePlayer{
    videoPlayer: any;
    _time: number;
    _volume: number;
    _duration: number;
    _isPlaying: boolean;
    _isLooping: boolean;
    _isMuted: boolean;
    get volume(): number {
        return this._volume;
    }
    get duration(): number {
        return this._duration;
    }
    get time(): number {
        return this._time;
    }
    get isPlaying(): boolean {
        return this._isPlaying;
    }
    get isLooping(): boolean {
        return this._isLooping;
    }
    get isMuted(): boolean {
        return this._isMuted;
    }
    async SendOrRun(path: string, args: any[], callback: ()=>{}) {
        if(this.isClientSide) {
            await this.WaitFor(this, "videoPlayer");
            await callback();
        }else{
            await this.SendToBrowser(path, args);
        }
    }
    async CreateBrowser(url: string) {
        this.browser = new BS.GameObject("BrowserVideoPlayer");
        this.browser.SetParent(this.videoContainer, false);
        const transform = await this.browser.AddComponent(new BS.Transform());
        transform.localScale = new BS.Vector3(1.73,1.73,1.73);
        this.browserPlayer = await this.browser.AddComponent(new BS.BanterBrowser(url));
        this.dispatchEvent(new CustomEvent("playing", {detail: false}));
        this.dispatchEvent(new CustomEvent("muted", {detail: false}));
        this.browser.On('browser-message', (e) => {
            try{
                const data = JSON.parse(e.detail);
                if(data.path === "ready") {
                    this.browserReady = true;
                }
            }catch{
                console.log("could not parse json!", e.detail);
            }
        });
        this.browser.On('browser-message', (e) => {
            try{
                const data = JSON.parse(e.detail);
                switch(data.path) {
                    case "time":
                        this._time = data.data;
                        break;
                    case "duration":
                        this._duration = data.data;
                        this.dispatchEvent(new CustomEvent("time", {detail: {time: this._time, duration: this._duration}}));
                        break;
                    case "looping":
                        this._isLooping = data.data;
                        this.dispatchEvent(new CustomEvent("looping", {detail: this._isLooping}));
                        break;
                    case "muted":
                        this._isMuted = data.data;
                        this.dispatchEvent(new CustomEvent("muted", {detail: this._isMuted}));
                        break;
                    case "playing":
                        this._isPlaying = data.data;
                        this.dispatchEvent(new CustomEvent("playing", {detail: this._isPlaying}));
                        break;
                    case "volume":
                        this._volume = data.data;
                        this.dispatchEvent(new CustomEvent("volume", {detail: this._volume}));
                        break;
                    case "sync-time":
                        this.syncTimeResolve(data.data);
                }
            }catch{
                console.log("could not parse json!", e.detail);
            }
        });
    }
    async SendToBrowser(path: string, args: any[]) {
        await this.WaitFor(this, "browserReady");
        this.browserPlayer.RunActions(JSON.stringify({actions: [{actionType: "postmessage", strParam1: JSON.stringify({path, args})}]}));
    }
    async SendToSpace(path: string, data: any) {
        await this.WaitFor(this, "videoPlayer");
        (window as any).bantermessage(JSON.stringify({path, data}));
    }
    RemoveBrowser() {
        if(!this.browser) {
            return;
        }
        this.browserReady = false;
        this.browser.Destroy();
        this.browser = null;
    }
}