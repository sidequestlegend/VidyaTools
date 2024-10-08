import { PlayabilityStatus, StreamingData } from "./models/streaming-data";
import { BasePlayer } from "./players/base-player";
import { BrowserHTML5Player } from "./players/browser-html5-player";
import { BrowserPlayer } from "./players/browser-player";
import { BrowserYoutubePlayer } from "./players/browser-youtube-player";
import { NativePlayer } from "./players/native-player";
import { VideoEventTarget } from "./video-event-target";

declare let BS: any;

export class VidyaPlayer  extends VideoEventTarget{
    NATIVE: NativePlayer;
    YOUTUBE: BrowserYoutubePlayer;
    HTML5: BrowserHTML5Player;
    currentPlayer: BasePlayer;
    players: BasePlayer[];
    videoContainer: any;
    url: string;
    playStarted: boolean;
    constructor(videoContainer, isClientSide: boolean = false) {
        super();
        this.videoContainer = videoContainer || (isClientSide ? null : new BS.GameObject("VideoPlayer"));
        this.NATIVE = new NativePlayer(this.videoContainer);
        this.YOUTUBE = new BrowserYoutubePlayer(this.videoContainer, isClientSide);
        this.HTML5 = new BrowserHTML5Player(this.videoContainer, isClientSide);
        this.players = [this.NATIVE, this.YOUTUBE, this.HTML5];
        this.players.forEach(p => {
            ["time", "playing", "muted", "volume", "looping"].forEach(d => p.On(d, e => this.dispatchEvent(new CustomEvent(d, {detail: e.detail}))));
        });
        this.SetupBrowserClient();
    }
    SetupBrowserClient() {
        if(!(window as any).BS) {
            if(new URLSearchParams(location.search).has("html5")) {
                this.ActivatePlayer(this.HTML5);
            }else{
                this.ActivatePlayer(this.YOUTUBE);
            }
            window.addEventListener("bantermessage", (e) => {
                try{
                    const message = JSON.parse((e as any).detail.message);
                    if(this.currentPlayer[message.path]) {
                        this.currentPlayer[message.path].bind(this.currentPlayer, ...message.args)();
                    }
                }catch(e) {
                    console.log(e);
                }
            });
            window.addEventListener("DOMContentLoaded", () => {
                (this.currentPlayer as BrowserPlayer).SendToSpace("ready", null);
            });
        }
    }
    
    async PlayToggle(): Promise<void>{return this.currentPlayer.PlayToggle()}
    async MuteToggle(): Promise<void> {return this.currentPlayer.MuteToggle()}
    async LoopToggle(): Promise<void> {return this.currentPlayer.LoopToggle()}
    async Stop(): Promise<void>{return this.currentPlayer.Stop()}
    async SetVolume(vol: number): Promise<void> {return this.currentPlayer.SetVolume(this.currentPlayer.Clamp(vol, 0, 1))}
    async Seek(time: number): Promise<void> {return this.currentPlayer.Seek(time)}
    get isPlaying(): boolean {
        return this.currentPlayer.isPlaying;
    }
    get isLooping(): boolean {
        return this.currentPlayer.isLooping;
    }
    get isMuted(): boolean {
        return this.currentPlayer.isMuted;
    }
    get time(): number {
        return this.currentPlayer.time;
    }
    get volume(): number {
        return this.currentPlayer.volume;
    }
    get duration(): number {
        return this.currentPlayer.duration;
    }
    FormatTime(time: number): string {
        if(!time) {
            return "00:00:00";
        }
        const hours = Math.floor(time / 60 / 60);
        const minutes = Math.floor(time / 60) - (hours * 60);
        const seconds = Math.floor(time) - (minutes * 60);
        return ('0' + hours).slice(-2) + ":" + ('0' + minutes).slice(-2) + ":" + ('0' + seconds).slice(-2);
    }
    async ActivatePlayer(player: BasePlayer) {
        if(this.currentPlayer === player) {
            return;
        }
        let time = 0, volume = 0.5, muted = false;
        if(this.currentPlayer) {
            time = await this.currentPlayer.GetSyncTime();
            volume = this.currentPlayer.volume;
            muted = this.currentPlayer.isMuted;
        }
        this.ResetActive();
        player.active = true;
        await this.SetCurrentPlayer();
        if((window as any).BS) {
            await this.Play(this.url);
            if(!this.duration && time) {
                await this.currentPlayer.WaitFor(this, "duration");
            }
            if(time) {
                await this.Seek(time);
            }
            await this.SetVolume(volume);
            if(muted) {
                this.MuteToggle();
            }
        }
    }
    async SetCurrentPlayer(){
        this.currentPlayer = this.players.filter(p => p.active)[0];
        await this.currentPlayer.Create();
    }
    ResetActive() {
        this.players.forEach(p => {
            p.Remove();
            p.active = false;
        });
    }
    IsYoutubePlayer() {
        return this.currentPlayer === this.YOUTUBE;
    }
    ParseYoutubeUrl(url: string) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match && match[2].length == 11) {
            return match[2];
        }
    }
    async Play(url: string) {
        if(this.playStarted || !url) {
            return;
        }
        this.playStarted = true;
        this.url = url;
        const youtubeVideoId = this.ParseYoutubeUrl(url);
        if (youtubeVideoId) {
            if(this.IsYoutubePlayer()) {
                this.currentPlayer.Play(youtubeVideoId);
            }else{
                const info: {streamingData: StreamingData, playabilityStatus: PlayabilityStatus} = await BS.BanterScene.GetInstance().YtInfo(youtubeVideoId);
                const isOk = info.playabilityStatus.status === "OK";
                if(!isOk && !this.IsYoutubePlayer()) {
                    if(info.playabilityStatus.status === "LOGIN_REQUIRED" && info.playabilityStatus.reason.includes("bot")) {
                        console.warn("YoutubeRateLimitError: Using youtube player since the api has rate limited us.");
                    }
                    this.dispatchEvent(new CustomEvent("warning", {detail: {type: "YtInfoError", detail: info.playabilityStatus.status + " " + info.playabilityStatus.reason}}));
                    await this.ActivatePlayer(this.YOUTUBE);
                }else if(isOk){
                    // trick to set the duration a little earlier.
                    this.currentPlayer.duration = <any>info.streamingData.formats[0].approxDurationMs/1000;
                    await this.currentPlayer.Play(info.streamingData.formats[0].url);
                }
            }
        }else{
            if(this.IsYoutubePlayer()) {
                console.warn("Youtube can only play youtube urls, switching to native player: " + this.url);
                this.dispatchEvent(new CustomEvent("warning", {detail: {type: "NonYoutubeUrlError", detail: "Youtube can only play youtube urls, switching to native player: " + this.url}}));
                await this.ActivatePlayer(this.NATIVE);
            }
            await this.currentPlayer.Play(url);
        }
        this.playStarted = false;
    }
}