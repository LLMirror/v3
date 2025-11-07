import mysql from 'mysql2';
const pool = mysql.createPool({
	host: "175.178.60.225",
	port: 3306,
	user: "admin",
	password: "Peitu7890!",
	database: "new_vue_admin",
	connectionLimit: 15,
	dateStrings: true
});
export default pool;


