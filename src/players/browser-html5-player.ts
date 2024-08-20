import { BrowserPlayer } from "./browser-player";
const dom = {loaded: false, isPlaying: false}
export class BrowserHTML5Player extends BrowserPlayer{
    videoContainer: any;
    html5_url = "https://" + location.host + "/?html5=true";
    currentTime: number;
    constructor(videoContainer, isClientSide: boolean) {
        super();
        this.videoContainer = videoContainer;
        this.isClientSide = isClientSide;
    }
    
    async Create(): Promise<void> {
        if(this.isClientSide) {
            await this.CreateClient();
        }else{
            await this.CreateBrowser(this.html5_url);
        }
    }

    IsPlaying() {
        dom.isPlaying = !!(this.videoPlayer && this.videoPlayer.currentTime > 0 && !this.videoPlayer.paused && !this.videoPlayer.ended && this.videoPlayer.readyState > 2 && this.videoPlayer.duration);
        return dom.isPlaying;
    }

    async GetSyncTime() {
        await this.SendOrRun("GetSyncTime", [], async () => this.SendToSpace("sync-time", this.videoPlayer.currentTime));
        return new Promise<number>(resolve=>this.syncTimeResolve = resolve);
    }
    async Play(url: string) {
        await this.SendOrRun("Play", [url], async () => {
            this.videoPlayer.src = url;
            this.videoPlayer.play();
            await this.WaitFor(dom, "isPlaying", null, () => this.IsPlaying(), 200);
            
            this.SendToSpace("duration", this.videoPlayer.duration);
            this.SendToSpace("playing", this.IsPlaying());
        });
    }
    async SetVolume(volume: number) {
        await this.SendOrRun("SetVolume", [volume], async () => {
            this.videoPlayer.volume = volume;
            this.SendToSpace("volume", this.videoPlayer.volume);
        });
    }

    async Seek(time: number) {
        await this.SendOrRun("Seek", [time], async () => {
            this.videoPlayer.currentTime = this.Clamp(time, 0, this.videoPlayer.duration);
            this.SendToSpace("time", this.videoPlayer.currentTime);
            this.SendToSpace("duration", this.videoPlayer.duration);
        });
    }

    async PlayToggle() {
        await this.SendOrRun("PlayToggle", [], async () => {
            const isPlaying = this.IsPlaying();
            if(isPlaying) {
                this.videoPlayer.pause();
            }else{
                this.videoPlayer.play();
            }
            this.SendToSpace("playing", this.IsPlaying());
        });
    }
    async Stop() {
        await this.SendOrRun("Stop", [], async () => {
            this.videoPlayer.pause();
            this.videoPlayer.currentTime = 0;
            this.SendToSpace("playing", this.IsPlaying());
        });
    }
    async MuteToggle() {
        await this.SendOrRun("MuteToggle", [], async () => {
            this.videoPlayer.muted = !this.videoPlayer.muted;
            this.SendToSpace("muted", this.videoPlayer.muted);
        });
    }
    async LoopToggle() {
        await this.SendOrRun("LoopToggle", [], async () => {
            this.videoPlayer.loop = !this.videoPlayer.loop;
            this.SendToSpace("looping", this.videoPlayer.loop);
        });
    }

    async CreateClient() {
        await this.WaitFor(dom, "loaded");
        this.videoPlayer = document.createElement('video');
        document.body.appendChild(this.videoPlayer);
        this.videoPlayer.addEventListener("ended", ()=>this.SendToSpace("playing", this.IsPlaying()));
        this.videoPlayer.addEventListener("pause", ()=>this.SendToSpace("playing", this.IsPlaying()));
        this.videoPlayer.addEventListener("play", ()=>this.SendToSpace("playing", this.IsPlaying()));
        requestAnimationFrame(this.Step.bind(this));
    }

    Step() {
        const currentTime = Math.floor(this.videoPlayer.currentTime);
        if(this.currentTime !== currentTime) {
            this.SendToSpace("time", this.videoPlayer.currentTime);
            this.SendToSpace("duration", this.videoPlayer.duration);
        }
        this.currentTime = currentTime;
        requestAnimationFrame(this.Step.bind(this));
    }

    async Remove() {
        if(!this.isClientSide) {
            await this.RemoveBrowser();
        }
    }
}

window.addEventListener("DOMContentLoaded", ()=>{
    dom.loaded = true;
});