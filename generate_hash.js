import argon2 from 'argon2';

const hash = await argon2.hash("password");
console.log("HASH:" + hash);
