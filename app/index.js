import Application from 'koa';
import Inspect from './inspect';
Object.assign(Application.prototype, Inspect);
export default Application;