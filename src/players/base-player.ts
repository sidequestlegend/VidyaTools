import { VideoEventTarget } from "../video-event-target";

export class BasePlayer extends VideoEventTarget{
    active: boolean;
    isClientSide: boolean;
    videoContainer: any;
    browser: any;
    browserPlayer: any;
    browserReady: boolean;
    syncTimeResolve: (value: number | PromiseLike<number>) => void;
    get time(): number { return 0 }
    get volume(): number { return 0 }
    get duration(): number { return 0 }
    get isMuted(): boolean { return false }
    get isPlaying(): boolean { return false }
    get isLooping(): boolean { return false }
    async Create(): Promise<void> {}
    Remove(): void{}
    async Play(url: string) {} // , audioUrl: string = null
    async PlayToggle(): Promise<void>{}
    async MuteToggle(): Promise<void> {}
    async LoopToggle(): Promise<void> {}
    async GetSyncTime(): Promise<number>{ return }
    async Stop(): Promise<void>{}
    async SetVolume(vol: number): Promise<void> {}
    async Seek(time: number): Promise<void> {}
    Clamp(val, min, max){ return Math.min(Math.max(val, min), max); }
    async WaitFor(parent, property, callback?, runBetween?, timeout = 100): Promise<void> {
        if(parent[property]) {
            if(callback) {
                callback();	
            }
            return;
        }
        const _wait = async (parent, property, callback) => {
            if(runBetween) {
                await runBetween();
            }
            if(parent[property]) {
                callback();
            }else{
                setTimeout(() => _wait(parent, property, callback), timeout);
            }
        }
        return callback ? _wait(parent, property, callback) : new Promise<void>((resolve) => _wait(parent, property, resolve));
    }
}