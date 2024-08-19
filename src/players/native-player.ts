import { BasePlayer } from "./base-player";
declare let BS: any;

export class NativePlayer extends BasePlayer{   
    videoPlayer: any;
    nativePlayer: any;
    get time(): number {
        if(this.nativePlayer) {
            return this.nativePlayer.time;
        }
        return 0;
    }
    get duration(): number {
        if(this.nativePlayer) {
            return this.nativePlayer.duration;
        }
        return 0;
    }
    get volume(): number {
        if(this.nativePlayer) {
            return this.nativePlayer.volume;
        }
        return 0;
    }
    get isPlaying(): boolean {
        if(this.nativePlayer) {
            return this.nativePlayer.isPlaying;
        }
        return false;
    }
    get isLooping(): boolean {
        if(this.nativePlayer) {
            return this.nativePlayer.isLooping;
        }
        return false;
    }
    get isMuted(): boolean {
        if(this.nativePlayer) {
            return this.nativePlayer.isMuted;
        }
        return false;
    }
    nativeAudio: any;
    // nativeAudioPlayer: any;

    constructor(videoContainer) {
        super();
        this.videoContainer = videoContainer;
    }
    async Create() {
        if(this.videoPlayer) {
            return;
        }
        this.videoPlayer = new BS.GameObject("NativeVideoPlayer");
        this.videoPlayer.SetParent(this.videoContainer, false);
        await this.videoPlayer.AddComponent(new BS.BanterGeometry(BS.GeometryType.PlaneGeometry, 0, 1.77777777778, 1));
        await this.videoPlayer.AddComponent(new BS.BanterMaterial("Unlit/Diffuse", "https://cdn.sidequestvr.com/file/666592/1x1000000.jpg", new BS.Vector4(1,1,1,1)));
        this.nativeAudio = await this.videoPlayer.AddComponent(new BS.BanterAudioSource());
        this.nativeAudio.spatialBlend = 1;
        this.nativePlayer = await this.videoPlayer.AddComponent(new BS.BanterVideoPlayer());
        this.nativePlayer.WatchProperties([BS.PropertyName.time]);
        this.videoPlayer.On("object-update", async () => {
            const muted = this.nativePlayer.isMuted;
            const playing = this.nativePlayer.isPlaying;
            await this.nativePlayer.Q([BS.PropertyName.isPrepared, BS.PropertyName.isMuted, BS.PropertyName.isPlaying, BS.PropertyName.duration]);
            this.dispatchEvent(new CustomEvent("time", {detail: {time: this.nativePlayer.time, duration: this.nativePlayer.duration}}));
            if(playing != this.nativePlayer.isPlaying) {
                this.dispatchEvent(new CustomEvent("playing", {detail: this.nativePlayer.isPlaying}));
            }
            if(muted != this.nativePlayer.isMuted) {
                this.dispatchEvent(new CustomEvent("muted", {detail: this.nativePlayer.isMuted}));
            }
        });
        this.dispatchEvent(new CustomEvent("playing", {detail: false}));
        this.dispatchEvent(new CustomEvent("muted", {detail: false}));
        // const nativeAudioPlayer = new BS.GameObject("NativeAudioPlayer");
        // this.nativeAudioPlayer = await nativeAudioPlayer.AddComponent(new BS.BanterVideoPlayer());
        // await nativeAudioPlayer.SetParent(this.videoPlayer, false);
    }
    async WaitForPlayer() {
        await this.WaitFor(this, "nativePlayer");
        return true;
    }
    async EnsurePrepared() {
        await this.WaitFor(this.nativePlayer, "isPrepared", null, async () => await this.nativePlayer.Q([BS.PropertyName.isPrepared]), 500);
    }
    async Play(url: string) {
        await this.WaitForPlayer();
        this.nativePlayer.url = url;
        await this.EnsurePrepared();
        await this.WaitFor(this.nativePlayer, "isPlaying", null, async () => await this.nativePlayer.Q([BS.PropertyName.isPlaying]), 500);
        this.dispatchEvent(new CustomEvent("playing", {detail: this.isPlaying}));
        // console.log("set url: ", url)
        // if(audioUrl) {
        //     // this.nativeAudioPlayer.url = audioUrl;
        // }
    }
    async GetSyncTime() {
        await this.nativePlayer.Q([BS.PropertyName.time]);
        console.log(this.nativePlayer.time);
        return this.nativePlayer.time;
    }
    async Seek(time: number) {
        await this.EnsurePrepared();
        await this.WaitForPlayer();
        this.nativePlayer.time = time;
        await this.nativePlayer.Q([BS.PropertyName.time]);
    }
    async PlayToggle() {
        await this.WaitForPlayer();
        this.nativePlayer.PlayToggle();
        await this.nativePlayer.scene.WaitForEndOfFrame();
        await this.nativePlayer.Q([BS.PropertyName.isPlaying]);
        this.dispatchEvent(new CustomEvent("playing", {detail: this.isPlaying}));
    }
    async Stop() {
        await this.WaitForPlayer();
        this.nativePlayer.Stop();
        await this.nativePlayer.scene.WaitForEndOfFrame();
        await this.nativePlayer.Q([BS.PropertyName.isPlaying]);
        this.dispatchEvent(new CustomEvent("playing", {detail: this.isPlaying}));
    }
    async MuteToggle() {
        await this.WaitForPlayer();
        this.nativePlayer.MuteToggle();
        await this.nativePlayer.scene.WaitForEndOfFrame();
        await this.nativePlayer.Q([BS.PropertyName.isMuted]);
        this.dispatchEvent(new CustomEvent("muted", {detail: this.isMuted}));
    }
    async SetVolume(volume: number) {
        await this.WaitForPlayer();
        this.nativePlayer.volume = volume;
        this.dispatchEvent(new CustomEvent("volume", {detail: this.nativePlayer.volume}));
    }
    async LoopToggle() {
        await this.nativePlayer.Q([BS.PropertyName.isLooping]);
        await this.WaitForPlayer();
        this.nativePlayer.isLooping = !this.nativePlayer.isLooping;
        this.dispatchEvent(new CustomEvent("looping", {detail: this.nativePlayer.isLooping}));
    }
    async Remove() {
        if(!this.videoPlayer) {
            return;
        }
        await this.videoPlayer.Async();
        this.videoPlayer.Destroy();
        this.videoPlayer = null;
    }
}