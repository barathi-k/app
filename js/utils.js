const inputTypes = [
    window.HTMLInputElement,
    window.HTMLSelectElement,
    window.HTMLTextAreaElement,
];

// Trigger simulated input value change for React 16 
const triggerInputChange = (node, value = '') => {
  if (!node) {
    return
  }
  //  source: https://github.com/facebook/react/issues/11488#issuecomment-1109772342
  // only process the change on elements we know have a value setter in their constructor
  if ( inputTypes.indexOf(node.__proto__.constructor) >-1 ) {

    const setValue = Object.getOwnPropertyDescriptor(node.__proto__, 'value').set;
    const event = new Event('input', { bubbles: true });

    setValue.call(node, value);
    node.dispatchEvent(event);
  }
};

function globalSearch(startObject, value) {
  var stack = [[startObject,'']];
  var searched = [];
  var found = false;

  var isArray = function(test) {
    return Object.prototype.toString.call( test ) === '[object Array]';
  }

  while(stack.length) {
    var fromStack = stack.pop();
    var obj = fromStack[0];
    var address = fromStack[1];

    if( typeof obj == typeof value && obj == value) {
      var found = address;
      break;
    }else if(typeof obj == "object" && searched.indexOf(obj) == -1){
      if ( isArray(obj) ) {
        var prefix = '[';
        var postfix = ']';
      }else {
        var prefix = '.';
        var postfix = '';
      }
      for( i in obj ) {
        stack.push( [ obj[i], address + prefix + i + postfix ] );
      }
      searched.push(obj);
    }
  }
  return found == '' ? true : found;
}

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const utils = {
  triggerInputChange,
  debounce,
  globalSearch
}
