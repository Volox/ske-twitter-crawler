
exports = module.exports {
	
	throttle:function(method, time, context) { 
		clearTimeout(method.tId); 
		method.tId= setTimeout(function() {
			method.call(context); 
		}, time);
	}
}