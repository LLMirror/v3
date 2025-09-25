import mysql from 'mysql2';
const pool = mysql.createPool({
	host: "127.0.0.1",
	// host: "114.132.176.234",
	port: 3306,
	user: "liulei",
	password: "icar19654!",
	database: "v11",
	connectionLimit: 15,
	dateStrings: true
});
export default pool;
