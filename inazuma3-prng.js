function PRNG(high, low, advancement) {
	this.seed = new MutableUint64(high, low);
	this.advancement = advancement || 0;
}

PRNG.A_HIGH = 0x5d588b65, PRNG.A_LOW = 0x6c078965;
PRNG.B_HIGH = 0x00000000, PRNG.B_LOW = 0x00269ec3;

PRNG.CONST_REVERSE = {
	A_HIGH: 0xdedcedae, A_LOW: 0x9638806d,
	B_HIGH: 0x9b1ae6e9, B_LOW: 0xa384e6f9
};

PRNG.CONST_ffffffff00000000 = {
	A_HIGH: 0x8f2f99a4, A_LOW: 0x00000001, 
	B_HIGH: 0xae4f7273, B_LOW: 0x00000000
};

PRNG.prototype.set_seed = function(high, low) {
	this.seed.high = high;
	this.seed.low = low;
	this.advancement = 0;
}

PRNG.prototype.rand = function(max) {
	this.seed.mul(PRNG.A_HIGH, PRNG.A_LOW);
	this.seed.add(PRNG.B_HIGH, PRNG.B_LOW);
	this.advancement ++;
	
	return PRNG.gen_rand(this.seed.high, max);
};

PRNG.prototype.step = function(num) {
	PRNG.step_seed(this.seed, num);
	this.advancement += num;
};

PRNG.step_seed = function(seed, num) {
	var a = new MutableUint64(PRNG.A_HIGH, PRNG.A_LOW);
	var b = new MutableUint64(PRNG.B_HIGH, PRNG.B_LOW);
	var n = num >>> 0;
	if (num < 0) {
		var c = PRNG.CONST_ffffffff00000000;
		seed.mul(c.A_HIGH, c.A_LOW);
		seed.add(c.B_HIGH, c.B_LOW);
	}
	while (true) {
		if (n & 1) {
			seed.mul(a.high, a.low);
			seed.add(b.high, b.low);
		}
		n >>>= 1;
		if (n === 0) break;
		
		var b_high = b.high, b_low = b.low;
		b.mul(a.high, a.low);
		b.add(b_high, b_low);
		
		a.mul(a.high, a.low);
	}
};

PRNG.prototype.reverse_rand = function(max) {
	var ret = PRNG.gen_rand(this.seed.high, max);
	
	var c = PRNG.CONST_REVERSE;
	this.seed.mul(c.A_HIGH, c.A_LOW);
	this.seed.add(c.B_HIGH, c.B_LOW);
	this.advancement --;
	
	return ret;
};

PRNG.prototype.clone = function() {
	return new PRNG(this.seed.high, this.seed.low, this.advancement);
}

PRNG.gen_rand = function(high, max) {
	// u32((x * y) / 2^32) を計算するのだが x * y の計算で誤差がでうる
	// y が 2^(53-32) 以下の場合 x * y は 2 ^ 53 以下となり誤差はでない
	var x = high, y = max;
	var _2_pow_32 = 0x100000000;
	var product = x * y;
	if (y <= (1<<(53-32)) || product % _2_pow_32 !== 0) {
		return u32(product / _2_pow_32);
	} else {
		return new MutableUint64(0, x).mul(0, y).high;
	}
};

function next_seed(seed) {
	seed.mul(PRNG.A_HIGH, PRNG.A_LOW);
	seed.add(PRNG.B_HIGH, PRNG.B_LOW);
}

function mod(a, b) {
	return (a % b) + (a < 0 ? b : 0);
}

function MutableUint64(high, low) {
	this.high = high;
	this.low = low;
}

MutableUint64.prototype.set = function(high, low) {
	this.high = high;
	this.low = low;
};

MutableUint64.prototype.add = function(o_high, o_low) {
	var low = this.low + o_low;
	var carry = low > 0xffffffff;
	this.low = u32(low);
	this.high = u32(this.high + o_high + (carry ? 1 : 0));
	return this;
};

MutableUint64.prototype.mul = function(b_high, b_low) {
	var a = this;
	var a3 = a.high >>> 16, a2 = a.high & 0xffff, a1 = a.low >>> 16, a0 = a.low & 0xffff;
	var b3 = b_high >>> 16, b2 = b_high & 0xffff, b1 = b_low >>> 16, b0 = b_low & 0xffff;
	
	/*
	
	掛け算の筆算
	
	              :  a3   a2   a1   a0
	            X :  b3   b2   b1   b0
	-------------------------------------
	              :a3b0 a2b0 a1b0 a0b0
	          a3b1:a2b1 a1b1 a0b1
	     a3b2 a2b2:a1b2 a0b2
	a3b3 a2b3 a1b3:a0b3
	------------------------------------
	
	a * b
	  = a0b0
	  + ((a1b0 + a0b1) << 16)
	  + ((a2b0 + a1b1 + a0b2) << 32)
	  + ((a3b0 + a2b1 + a1b2 + a0b3) << 48)
	*/
	
	this.high = u32((a2*b0 + a1*b1 + a0*b2) + (a3*b0 + a2*b1 + a1*b2 + a0*b3) * 0x10000);
	this.low = u32(a0*b0);
	
	// ((a1b0 + a0b1) << 16)の部分はhighとlowにまたがっていて繰り上がりの処理をしなければならない
	var x = a1*b0;
	this.add(x >>> 16, u32(x << 16));
	var x = a0*b1;
	this.add(x >>> 16, u32(x << 16));
	
	return this;
};

MutableUint64.prototype.toString = function() {
	return (0x100000000 + this.high).toString(16).slice(1) + (0x100000000 + this.low).toString(16).slice(1);
}

function u32(x) {
	return x >>> 0;
}
