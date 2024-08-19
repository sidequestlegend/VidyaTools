import { BrowserPlayer } from "./browser-player";
declare let BS: any, YT: any;

const youtube = {ready: false, isPlaying: false};

export class BrowserYoutubePlayer extends BrowserPlayer{
    videoPlayer: any;
    youtube_url = "https://" + location.host + "/?youtube=true";
    readyToPlay: boolean;
    loop: boolean;
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
            await this.CreateBrowser(this.youtube_url);
        }
    }

    async GetSyncTime() {
        await this.SendOrRun("GetSyncTime", [], async () => this.SendToSpace("sync-time", this.videoPlayer.getCurrentTime()));
        return new Promise<number>(resolve=>this.syncTimeResolve = resolve);
    }

    async Play(videoId: string) {
        await this.SendOrRun("Play", [videoId], async () => {
            this.videoPlayer.loadVideoById(videoId, 0);
            this.videoPlayer.playVideo();
            await this.WaitFor(youtube, "isPlaying");
            this.SendToSpace("duration", this.videoPlayer.getDuration());
            this.SendToSpace("playing", youtube.isPlaying);
        });
    }

    async Seek(time: number) {
        await this.SendOrRun("Seek", [time], async () => {
            await this.WaitFor(youtube, "isPlaying");
            this.videoPlayer.seekTo(time);
            this.SendToSpace("time", this.videoPlayer.getCurrentTime());
            this.SendToSpace("duration", this.videoPlayer.getDuration());
        });
    }

    async PlayToggle() {
        await this.SendOrRun("PlayToggle", [], async () => {
            if(youtube.isPlaying) {
                this.videoPlayer.pauseVideo();
            }else if(this.videoPlayer.getPlayerState() === 2){
                this.videoPlayer.playVideo();
            }
            this.SendToSpace("playing", youtube.isPlaying);
        });
    }
    async Stop() {
        await this.SendOrRun("Stop", [], async () => {
            this.videoPlayer.stopVideo();
            this.SendToSpace("playing", youtube.isPlaying);
        });
    }
    async MuteToggle() {
        await this.SendOrRun("MuteToggle", [], async () => {
            await this.WaitFor(youtube, "isPlaying");
            if(this.videoPlayer.isMuted()) {
                this.videoPlayer.unMute()
            }else{
                this.videoPlayer.mute()
            }
            this.SendToSpace("muted", this.videoPlayer.isMuted());
        });
    }
    async SetVolume(volume: number) {
        await this.SendOrRun("SetVolume", [volume], async () => {
            await this.WaitFor(youtube, "isPlaying");
            this.videoPlayer.setVolume(volume * 100);
            this.SendToSpace("volume", this.videoPlayer.getVolume() / 100);
        });
    }
    async LoopToggle() {
        await this.SendOrRun("LoopToggle", [], async () => {
            await this.WaitFor(youtube, "isPlaying");
            this.loop = !this.loop;
            this.videoPlayer.setLoop(this.loop);
            this.SendToSpace("looping", this.loop);
        });
    }

    async CreateClient() {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        await this.WaitFor(youtube, "ready")
        const playerDiv = document.createElement('div');
        playerDiv.id = "player";
        document.body.appendChild(playerDiv);
        new YT.Player('player', {
            height: window.innerHeight,
            width: window.innerWidth,
            // videoId: this.core.getId(decodeURIComponent(this.core.params.youtube)),
            playerVars: {
                'playsinline': 1,
                'autoplay': 1,
                'disablekb': 1,
                'controls': 0,
                'modestbranding': true,
                'cc_load_policy': 1,
                'cc_lang_pref': 'en',
                'iv_load_policy': 3,
                'origin': 'https://www.youtube.com',
                'start': 0 // this.start ? Number(this.start) :
            },
            events: {
                onStateChange: event => {
                    if(event.data === YT.PlayerState.PLAYING) {
                        this.readyToPlay = true;
                    }else if(this.readyToPlay && event.data !== YT.PlayerState.PLAYING) {
                        this.videoPlayer.playVideo();
                    }
                    youtube.isPlaying = event.data === YT.PlayerState.PLAYING;
                    this.SendToSpace("playing", youtube.isPlaying);
                },
                onError: event => {
                    console.log(event.data);
                },
                onApiChange: async event => {
                },
                onReady: async event => {
                    this.videoPlayer = event.target; 
                    // this.setVolume();
                    // this.setMute();
                    // setTimeout(() => this.startPlayerOrNot(), 500);
                }
            }
        });
        requestAnimationFrame(this.Step.bind(this));
    }

    Step() {
        if(this.videoPlayer) {
            const currentTime = Math.floor(this.videoPlayer.getCurrentTime());
            if(this.currentTime !== currentTime) {
                this.SendToSpace("duration", this.videoPlayer.getDuration());
                this.SendToSpace("time", this.videoPlayer.getCurrentTime());
            }
            this.currentTime = currentTime;
        }
        requestAnimationFrame(this.Step.bind(this));
    }

    async Remove() {
        if(!this.isClientSide) {
            await this.RemoveBrowser();
        }
    }
}


(window as any).onYouTubeIframeAPIReady = function() {
    youtube.ready = true;
}