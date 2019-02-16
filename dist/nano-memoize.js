(function() {
	"use strict";
	const hsVrgs = (f) => {
		const s = f+"",
			i = s.indexOf("...");
		return i>=0 && i<s.indexOf(")" || s.indexOf("arguments")>=0);
		};
	function nanomemoize (fn, options={}) {
		// for sngl argument functions, just use a JS object key look-up
		function sngl (f,s,chng,serializer,arg) {
		  // strings must be stringified because cache[1] should not equal or overwrite cache["1"] for value = 1 and value = "1"
			const key = (!arg || typeof arg === "number" || typeof arg ==="boolean" ? arg : serializer(arg));
			if(chng) chng(key);
			return s[key] || ( s[key] = f.call(this, arg));
		}
		// for mltpl arg functions, loop through a cache of all the args
		// looking at each arg separately so a test can abort as soon as possible
		function mltpl(f,k,v,eq,chng,max=0,...args) {
			const rslt = {};
			for(let i=0;i<k.length;i++) { // an array of arrays of args
				let key = k[i];
				if(max) { key = key.slice(0,max); }
				if(key.length===args.length || (max && key.length<args.length)) {
					const max = key.length - 1;
					for(let j=0;j<=max;j++) {
						if(!eq(key[j],args[j])) { break; } // go to next key if args don't match
						if(j===max) { // the args matched
							rslt.i = i;
							rslt.v = v[i]; // get the cached value
						}
					}
				}
			}
			const i = rslt.i>=0 ? rslt.i : v.length;
			if(chng) { chng(i); }
			return typeof rslt.v === "undefined" ? v[i] = f.call(this,...(k[i] = args)) : rslt.v;
		}
		const {
			serializer = (value) => JSON.stringify(value),
			equals,
			maxAge,
			maxArgs,
			vargs = hsVrgs(fn),
			expireInterval = 1
		} = options,
			s = {}, // sngl arg function key/value cache
			k = [], // mltpl arg function arg key cache
			v = [], // mltpl arg function result cache
			c = {}, // key chng cache
			chng = (cache,key) => { // logs key chngs
				c[key] = {key,cache};
			},
			t =  {},
			tmout = (chng) => { // deletes timed-out keys
				if(t[chng.key]) { clearTimeout(t[chng.key]); }
				t[chng.key] = setTimeout(() => {
					delete chng.cache[chng.key];
					delete t[chng.key];
				},maxAge);
			};
		let f,
			unry = fn.length===1 && !equals && !vargs;
	  // pre-bind core arguments, faster than using a closure or passing on stack or in this case using a partial
		if(unry) {
			f = sngl.bind(
				 this,
				 fn,
				 s,
				 (maxAge ? chng.bind(this,s): null), // turn chng logging on and bind to arg cache s
				 serializer
				 );
		} else {
			f = mltpl.bind(
					 this,
					 fn,
					 k,
					 v,
					 equals || ((a,b) => a===b), // default to just a regular strict comparison
					 (maxAge ? chng.bind(this,v): null), // turn chng logging on and bind to arg cache v
					 maxArgs
					 );
		}
		// reset all the caches, must chng array length or delete keys on objects to retain bind integrity
		f.clear = () => {
			Object.keys(s).forEach((k) => delete s[k]);
			k.length = 0; //k.splice(0,k.length);
			v.length = 0; //v.splice(0,v.length);
			Object.keys(c).forEach(k => delete c[k]);
			Object.keys(t).forEach(k => { clearTimeout(t[k]); delete t[k]; });
		};
		f.keys = () => (!unry ? k.slice() : null);
		f.values = () => (!unry ? v.slice() : null);
		f.keyValues = () => (unry ? Object.assign({},s) : null);
		if(expireInterval) {
			f.interval = setInterval(() => { // process key chngs out of cycle for speed
				for(const p in c) {
					if(maxAge) { tmout(c[p]); }
					delete c[p];
				}
			},expireInterval);
		}
		return f;
	}
		
	if(typeof(module)!=="undefined") module.exports = nanomemoize;
	if(typeof(window)!=="undefined") window.nanomemoize = nanomemoize;
}).call(this);

