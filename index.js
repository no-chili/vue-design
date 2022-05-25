import { h, Portal } from "./vue.js";
// 一个函数式组件
function MyFunctionalComponent() {}

// 传递给 h 函数的第一个参数就是组件函数本身
const functionalComponentVNode = h(MyFunctionalComponent, null, h("div"));

console.log(functionalComponentVNode);
