import Application from './src';
import Inspect from './inspect';
Object.assign(Application.prototype, Inspect);
export default Application;