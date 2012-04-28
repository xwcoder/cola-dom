(function(){
//var log = console.log;    
//log = function(){};
//var chunker = /^\s*([^ +~>]+?(?=[ +~>]|$)|[+~>])(.*)/,
var chunker = /^\s*([^ +~>]+?\[(.*?)\](?=[ +~>]|$)|[^ +~>]+?(?=[ +~>]|$)|[+~>])(.*)/,
    noWord = /\W+/,
    colaID = 0,
    expando = 'cola' + (Math.random() + '').replace('.',''),
    CHAIN_NAME = 'cola_chain' + (Math.random() + '').replace('.','');

var Expr = {
    //order : ['ID','CLASS','NAME','TAG'],
    order : ['ID','NAME','TAG'],
    match : {
        //'ID' : /^#(.*?)[\[: &]/,
        'ID' : /^#(.*?)(?=[ \[\.: ]|$)(.*)/,
        'CLASS' : /^\.(.*?)(?=[\[:\. ]|$)(.*)$/,
        'NAME' : /\[name=['" ](.*?)['" \]]/,
        'TAG' : /^([\u0061-\u007A|\u0041-\u005A|0-9]+?)(?=[ \.\[:]|$)(.*)/
    },

    filterOrder : ['ID','CLASS','ATTR','PSEUDO','TAG'],

    filterReg : {
        'PSEUDO' : /^:(.*?)(?=[ \.]|$)(.*)/,
        'ID' : /^#(.*?)(?=[ \[\.: ]|$)(.*)/,
        'CLASS' : /^\.(.*?)(?=[ \[\.:]|$)(.*)/,
        'ATTR' : /^\[(.*?)\](.*)/,
        'TAG' : /^([\u0061-\u007A|\u0041-\u005A|0-9]+?)(?=[ \.\[:]|$)(.*)/
    },

    find : {
        'ID' : function(expr,context){
            return context.getElementById(expr);
        }, 
        'CLASS' : function(expr,context){
            if(typeof context.getElementsByClassName !== 'undefined'){
                return context.getElementsByClassName(expr);
            }  
        },
        'TAG' : function(tagName,context){
            return context.getElementsByTagName(tagName);
        }
    },
    relative : {
        '>' : function(set,expr){
            expr = expr || '';
            set = set || [];
            var r = [], i, len, e, _set;

            if(expr && !noWord.test(expr)){
                expr = expr.toLowerCase();
                for(i = 0,len = set.length; i < len; i++){
                    e = set[i].parentNode;
                    if(set[i] && e.nodeName.toLowerCase() === expr){
                        addChain(e,set[i]);
                        r.push(e);
                    };
                }
            }else{
                for(i = 0,len = set.length; i < len; i++){
                    if(set[i]){
                        e = set[i].parentNode;
                        _set = [e];
                        expr && cola.filter(_set,expr);
                        if(_set[0]){
                            addChain(e,set[i]);
                            r.push(e);
                        }else{
                            removeChian(set[i]);
                        }
                    }
                }
            }
            return r;
        },

        ' ' : function(set, expr){
            var e, _set, i = 0, len = set.length, r = [];
            var id = colaID++, flag; 
            for(;i < len; i++){
                flag = false;
                e = set[i];
                if(!e){
                    continue;
                }
                e = e.parentNode;
                while(e){
                    _set = [e];
                    expr && cola.filter(_set,expr);

                    if(_set[0]){
                        if(e[expando] !== id){
                            e[expando] = id;
                            r.push(e);
                        }
                        addChain(e,set[i]);
                        flag = true;
                    }
                    e = e.parentNode;
                }
                if(!flag){
                    removeChian(set[i]);
                }
            };
            return r;
        },

        '~' : function(set, expr){
            var e, _set, i = 0, len = set.length, r = [], flag;
            var id = colaID++; 
            for(;i < len; i++){
                flag = false;
                e = set[i];
                if(!e){
                    continue;
                }
                
                while((e = e.previousSibling)){
                    if(e.nodeType !== 1){
                        continue;
                    }
                    _set = [e];
                    expr && cola.filter(_set,expr);
                    if(_set[0]){
                        if(e[expando] !== id){
                            e[expando] = id;
                            r.push(e);
                        }
                        addChain(e,set[i]);
                        flag = true;
                    }
                }
                if(!flag){
                    removeChian(set[i]);
                }
            };
            return r;
        },
        
        '+' : function(set, expr){
            var i = 0, len = set.length, r = [], e, _set, flag;
            for(;i < len; i++){
                flag = false;
                if(!set[i]){
                    continue;
                }
                e = set[i];
                while((e = e.previousSibling)){
                    if(e.nodeType == 1){
                        _set = [e];
                        expr && cola.filter(_set,expr);
                        if(_set[0]){
                            addChain(e,set[i]);
                            r.push(e);
                            flag = true;
                        }
                        break;
                    }
                }
                if(!flag){
                    removeChian(set[i]);
                }
            }

            return r;
        }
    },

    pseudoFilter : {
        'FIRST-CHILD' : function(set, m , keep){
            var i = 0, len = set.length, e, p, f;
            for(; i < len; i++){
                e = set[i]; 
                if(e){
                    p = e.parentNode; 
                    if(p){
                        f = p.firstChild;
                        while(f && f.nodeType != 1){
                            f = f.nextSibling;
                        }
                        if(e != f){
                            removeChian(e);
                            keep ? (set[i] = false) : set.splice(i--,1);
                        }
                    }else{
                        removeChian(e);
                    }
                }
            }
        },

        'LAST-CHILD' : function(set, m, keep){
            var i = 0, len = set.length, e, p, l;  
            for(;i < len; i++){
                e = set[i];
                if(e){
                    p = e.parentNode;
                    if(p){
                        l = p.lastChild;
                        while(l && l.nodeType != 1){
                            l = l.previousSibling;
                        }
                        if(e != l){
                            removeChian(e);
                            keep ? (set[i] = false) : set.splice(i--,1);
                        }
                    }else{
                        removeChian(e);
                    }
                }
            }
        }
    },

    filter : {
        'PSEUDO' : function(set,filter, keep){
            var reg = /((?:first-child)|(?:last-child))/;
            m = reg.exec(filter);
            if(!m){
                throw new Error('不能识别的伪类');
            }
            try{
                Expr.pseudoFilter[m[1].toUpperCase()](set,m,keep); 
            }catch(e){
                throw new Error('不能识别的伪类');
            }
        },
        'TAG' : function(set, filter, keep){
            var e, i = 0, len = set.length;
            filter = filter.toUpperCase();
            for(; i < len; i++){
                e = set[i];
                if(e && (!e.tagName || e.tagName != filter)){
                    removeChian(e);
                    keep ? (set[i] = false) : set.splice(i--,1);
                }
            }
        }, 
        'CLASS' : function(set, filter, keep){
            var reg = new RegExp('\\b' + filter + '\\b'),
                e, i = 0, len = set.length;

            for(; i < len; i++){
                e = set[i];
                if(e && !reg.exec(e.className)){
                    removeChian(e);
                    keep ? (set[i] = false) : set.splice(i--,1);
                }
            }
        },
        'ID' : function(set, filter, keep){
            var e, i = 0, len = set.length;
            for(; i < len; i++){
                e = set[i];
                if(e && e.getAttribute && e.getAttribute('id') != filter){
                    removeChian(e);
                    keep ? (set[i] = false) : set.splice(i--,1);
                } 
            }
        },
        'ATTR' : function(set, filter, keep){
            var reg = /^(.*?)\s*(=|(?:~=)|(?:\|=)|(?:\^=)|(?:\$=)|(?:\*=))\s*['"]*(.*?)['"]*$/,
                i = 0, len = set.length, e, r = [];

            var attr = function(e, m){
                var name = m[1],
                    oper = m[2],
                    value = m[3];

                if(!e){
                    return false;
                }
                var attr = e.getAttribute(name);
                switch(oper){
                    case '=' :
                        return attr == value;
                    case '~=' :
                        return attr && new RegExp('\\b' + value + '\\b').test(attr);
                    case '^=' :
                        return attr && attr.indexOf(value) == 0;
                    case '$=' : 
                        return attr && new RegExp(value + '$').test(attr);
                    case '|=' :
                        return attr && (attr == value || attr.indexOf(value+'_') == 0);
                    case '*=' :
                        return attr && attr.indexOf(value) != -1;    
                    default :
                        return attr != null;
                }
                
            };

            if(!(m = reg.exec(filter))){
                m = [filter,filter,'',filter];
            }

            for(; i < len; i++){
                e = set[i];
                if(e && !attr(e, m)){
                    removeChian(e);
                    keep ? (set[i] = false) : set.splice(i--,1);
                }
            }
        }
    }
};

var cola = {
    query : function(selector,context){
        context = context || document;
        if((context.nodeType !== 1 && context.nodeType !== 9) ||
            !selector || typeof selector !== 'string'){
            return [];
        }
        var orginSelector = selector,result = [],s;

        selector = selector.split(',');
        for(var i = 0, len = selector.length; i < len; i++){
            result = result.concat(this._query(selector[i],context));
        }
        if(selector.length > 1){
            result.uni
        }
        return result;
    },
    _query : function(selector,context){
        CHAIN_NAME += colaID++;
        var m = selector,parts = [], r, result=[], i, e, len, set, relation,pop, map = {},
            relatives = Expr.relative;
        do{
            m = chunker.exec(m);
            if(m){
                parts.push(m[1]);
                m = m[3];
            }
        }while(m);

        set = this.find(parts.pop(),context);
        if(!set || !set.length){
            return [];
        }
        r = set;
        for(i = 0, len = r.length; i < len; i++){
            r[i][CHAIN_NAME] = [i];
        }
        while(parts.length){
            relation = pop = parts.pop();
            relatives[relation] ? pop = parts.pop() : relation = ' ';
            r = relatives[relation](r,pop);
        }
        while((e = r.pop())){
            result = result.concat(e[CHAIN_NAME]);
        }

        r = [];
        result.sort(function(a,b){return a - b;});
        for(i = 0; i < result.length; i++){
            if(!map[result[i]]){
                map[result[i]] = true;
                e = set[result[i]];
                e.removeAttribute && e.removeAttribute(CHAIN_NAME);
                r.push(e); 
            }   
        }
        return r; 
    },

    find : function(expr,context){
        var type,order = Expr.order,m,filter,set;
        filter = expr;
        for(var i = 0,len = order.length; i < len; i++){
            type = order[i];
            if((m = Expr.match[type].exec(expr))){
                if((set = Expr.find[type](m[1],context))){
                    filter = m[2] || '';
                    break;
                };
            }
        }
        if(!set){
            set = typeof context.getElementsByTagName !== 'undefined' ?
                    context.getElementsByTagName('*') : [];
        }
        set = makeArray(set);
        if(filter){
            this.filter(set,filter);
        }
        return set;
    },
    filter : function(set, expr, keep){
        var type, order = Expr.filterOrder, m, filter, set, r, regs = Expr.filterReg;
        for(var i = 0,len = order.length; i < len; i++){
            type = order[i];
            if((m = regs[type].exec(expr))){
                Expr.filter[type](set, m[1]);
                filter = m[2] || '';
                break;
            }
        }
        if(filter){
            this.filter(set, filter, keep);
        }
        return set;
    },
};

var addChain = function(e, s){
    if(e){
        e[CHAIN_NAME] = e[CHAIN_NAME] || [];
        e[CHAIN_NAME] = e[CHAIN_NAME].concat(s[CHAIN_NAME]);
    }
};

var removeChian = function(e){
    e && (e[CHAIN_NAME] = null);
    //e && e.removeAttribute && e.removeAttribute(CHAIN_NAME);
};

if(document.documentElement.contains){
	cola.contains = function( a, b ){
		return a !== b && (a.contains ? a.contains(b) : true);
	};

}else if(document.documentElement.compareDocumentPosition){
	cola.contains = function( a, b ) {
		return !!(a.compareDocumentPosition(b) & 16);
	};

}else{
	cola.contains = function(){
		return false;
	};
}

var slice = Array.prototype.slice,
    toString = Object.prototype.toString;

var makeArray = function(array){
    array = slice.call(array,0);
    return array;
};
try{
	slice.call( document.documentElement.childNodes, 0 )[0].nodeType;
}catch(e){
    makeArray = function(array){
        var i = 0, len = array.length, r=[];
        for(;i < len; i++){
            r.push(array[i]);
        }
        return r;
    };
}

window.cola = cola;
})();
