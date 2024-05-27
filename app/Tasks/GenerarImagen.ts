import { BaseTask } from 'adonis5-scheduler/build/src/Scheduler/Task';

export default class GenerarImagen extends BaseTask {
    public static get schedule() {
        return '*/1 * * * *';
    }
    public static get useLock() {
        return true;
    }
    public async handle(){
        console.log('hola soy el job');
        
    }
}