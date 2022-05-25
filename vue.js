export const Fragment = Symbol(); //一个抽象标签类型,用来表示多节点元素
export const Portal = Symbol(); //传送节点，该节点类型直接挂载到target目标

// VNode的类型
export const VNodeFlags = {
  // html 标签
  ELEMENT_HTML: 1,
  // SVG 标签
  ELEMENT_SVG: 1 << 1,

  // 普通有状态组件
  COMPONENT_STATEFUL_NORMAL: 1 << 2,
  // 需要被keepAlive的有状态组件
  COMPONENT_STATEFUL_SHOULD_KEEP_ALIVE: 1 << 3,
  // 已经被keepAlive的有状态组件
  COMPONENT_STATEFUL_KEPT_ALIVE: 1 << 4,
  // 函数式组件
  COMPONENT_FUNCTIONAL: 1 << 5,

  // 纯文本
  TEXT: 1 << 6,
  // Fragment
  FRAGMENT: 1 << 7,
  // Portal
  PORTAL: 1 << 8,
};

// html 和 svg 都是标签元素，可以用 ELEMENT 表示
VNodeFlags.ELEMENT = VNodeFlags.ELEMENT_HTML | VNodeFlags.ELEMENT_SVG;
// 普通有状态组件、需要被keepAlive的有状态组件、已经被keepAlice的有状态组件 都是“有状态组件”，统一用 COMPONENT_STATEFUL 表示
VNodeFlags.COMPONENT_STATEFUL =
  VNodeFlags.COMPONENT_STATEFUL_NORMAL |
  VNodeFlags.COMPONENT_STATEFUL_SHOULD_KEEP_ALIVE |
  VNodeFlags.COMPONENT_STATEFUL_KEPT_ALIVE;
// 有状态组件 和  函数式组件都是“组件”，用 COMPONENT 表示
VNodeFlags.COMPONENT =
  VNodeFlags.COMPONENT_STATEFUL | VNodeFlags.COMPONENT_FUNCTIONAL;

//子节点
export const ChildrenFlags = {
  // 未知的 children 类型
  UNKNOWN_CHILDREN: 0,
  // 没有 children
  NO_CHILDREN: 1,
  // children 是单个 VNode
  SINGLE_VNODE: 1 << 1,

  // children 是多个拥有 key 的 VNode
  KEYED_VNODES: 1 << 2,
  // children 是多个没有 key 的 VNode
  NONE_KEYED_VNODES: 1 << 3,
};

//把文本节点转换成VNode
function createTextVNode(text) {
  return {
    _isVNode: true,
    // flags 是 VNodeFlags.TEXT
    flags: VNodeFlags.TEXT,
    tag: null,
    data: null,
    // 纯文本类型的 VNode，其 children 属性存储的是与之相符的文本内容
    children: text,
    // 文本节点没有子节点
    childFlags: ChildrenFlags.NO_CHILDREN,
    el: null,
  };
}
//确保每个VNode节点加上key
function normalizeVNodes(children) {
  const newChildren = [];
  // 遍历 children
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.key == null) {
      // 如果原来的 VNode 没有key，则使用竖线(|)与该VNode在数组中的索引拼接而成的字符串作为key
      child.key = "|" + i;
    }
    newChildren.push(child);
  }
  // 返回新的children，此时 children 的类型就是 ChildrenFlags.KEYED_VNODES
  return newChildren;
}

//渲染函数
export function h(tag, data = null, children = null) {
  let flags = null;
  if (typeof tag === "string") {
    flags = tag === "svg" ? VNodeFlags.ELEMENT_SVG : VNodeFlags.ELEMENT_HTML;
  } else if (tag === Fragment) {
    flags = VNodeFlags.FRAGMENT;
  } else if (tag === Portal) {
    flags = VNodeFlags.PORTAL;
    tag = data && data.target;
  } else {
    // 兼容 Vue2 的对象式组件
    if (tag !== null && typeof tag === "object") {
      flags = tag.functional
        ? VNodeFlags.COMPONENT_FUNCTIONAL // 函数式组件
        : VNodeFlags.COMPONENT_STATEFUL_NORMAL; // 有状态组件
    } else if (typeof tag === "function") {
      // Vue3 的类组件
      flags =
        tag.prototype && tag.prototype.render
          ? VNodeFlags.COMPONENT_STATEFUL_NORMAL // 有状态组件
          : VNodeFlags.COMPONENT_FUNCTIONAL; // 函数式组件
    }
  }

  let childFlags = null;
  if (Array.isArray(children)) {
    const { length } = children;
    if (length === 0) {
      // 没有 children
      childFlags = ChildrenFlags.NO_CHILDREN;
    } else if (length === 1) {
      // 单个子节点
      childFlags = ChildrenFlags.SINGLE_VNODE;
      children = children[0];
    } else {
      // 多个子节点，且子节点使用key
      childFlags = ChildrenFlags.KEYED_VNODES;
      children = normalizeVNodes(children);
    }
  } else if (children == null) {
    // 没有子节点
    childFlags = ChildrenFlags.NO_CHILDREN;
  } else if (children._isVNode) {
    // 单个子节点
    childFlags = ChildrenFlags.SINGLE_VNODE;
  } else {
    // 其他情况都作为文本节点处理，即单个子节点，会调用 createTextVNode 创建纯文本类型的 VNode
    childFlags = ChildrenFlags.SINGLE_VNODE;
    children = createTextVNode(children + "");
  }

  return {
    _isVNode: true,
    flags,
    tag,
    data,
    children,
    childFlags,
    el: null,
  };
}

function render(vnode, container) {
  const prevVNode = container.vnode;
  if (prevVNode == null) {
    if (vnode) {
      // 没有旧的 VNode，只有新的 VNode。使用 `mount` 函数挂载全新的 VNode
      mount(vnode, container);
      // 将新的 VNode 添加到 container.vnode 属性下，这样下一次渲染时旧的 VNode 就存在了
      container.vnode = vnode;
    }
  } else {
    if (vnode) {
      // 有旧的 VNode，也有新的 VNode。则调用 `patch` 函数打补丁
      patch(prevVNode, vnode, container);
      // 更新 container.vnode
      container.vnode = vnode;
    } else {
      // 有旧的 VNode 但是没有新的 VNode，这说明应该移除 DOM，在浏览器中可以使用 removeChild 函数。
      container.removeChild(prevVNode.el);
      container.vnode = null;
    }
  }
}
