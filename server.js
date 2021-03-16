'use strict';

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');
const cors = require('cors');

const PORT = process.env.PORT || 4000;
const app = express();


require('dotenv').config();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');


const client = new pg.Client(process.env.DATABASE_URL);
// const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });


// Routes 
app.get('/', homepageHandler);
app.get('/getCountryResult', getCountryResultHnadler);
app.get('/allCountries', allCountriesHandler);
app.post('/myRecords' , myRecordsHandler ) ;
app.get('/myRecords' , myRecordsHandler2 );
app.get('/recordDetail/:id', recordDetailHandler);
app.delete('/deleteRecordDetail/:id', deleteRecordDetailHandler);
app.put('/updateRecordDetail/:id', updateRecordDetailHandler);

// Handlers 

function homepageHandler(req, res) {
    let url = `https://api.covid19api.com/world/total`;
    superagent.get(url)
        .then(result => {
            res.render('pages/home', { worldCases: result.body })
        })
}

function getCountryResultHnadler(req, res) {
    let { country, from, to } = req.query;
    let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;

    superagent.get(url)
    .then((data) =>{
        let countryData = data.body.map((item)=>{
             return new Country (item) ; 

        })
        res.render ('pages/getCountryResult' , { data : countryData}) ;
    })
}

function allCountriesHandler (req , res){
     let url = `https://api.covid19api.com/summary` ;

     superagent.get(url)
     .then((data)=>{
        let countriesData = data.body.Countries.map((item)=>{
            return new AllCountries (item) ; 
       })
       res.render ('pages/allCountries' , { data : countriesData}) ;
     })
}

function  myRecordsHandler (req , res){
    let {country,totalConfirmed,totalDeaths,totalRecovered,date }= req.body ;
    let sql = `INSERT INTO countries (country,totalConfirmed,totalDeaths,totalRecovered,date) VALUES ($1, $2 , $3 , $4 , $5 ) RETURNING *;` ;
    let values = [country,totalConfirmed,totalDeaths,totalRecovered,date] ;
     
    client.query(sql, values)
    .then((results) => {
		res.redirect('/myRecords');
	});
}

function  myRecordsHandler2 (req , res){
    let sql = `SELECT * FROM countries` 
    client.query(sql)
    .then((results) => {
        console.log(results.rows) ;
		res.render('pages/myRecords' , {data : results.rows}) ;
	});
}

function recordDetailHandler(req,res){
    let id = req.params.id;
	let sql = 'SELECT * FROM countries WHERE id=$1;';
	let value = [id];
	client.query(sql, value)
    .then((results) => {
		res.render('pages/recordDetails', { data: results.rows[0] });
	});
}

function updateRecordDetailHandler(req, res) {
	let id = req.params.id;
	let { country, totalConfirmed, totalDeaths, totalRecovered, date } = req.body;
	let sql =
		'UPDATE countries SET country=$1,totalConfirmed=$2,totalDeaths=$3,totalRecovered=$4,date=$5 WHERE id=$6;';
	let values = [country, totalConfirmed, totalDeaths, totalRecovered, date, id];
	client.query(sql, values).then((results) => {
		res.redirect(`/recordDetail/${id}`);
	});
}

function deleteRecordDetailHandler(req, res) {
	let id = req.params.id;
	let sql = 'DELETE FROM countries WHERE id=$1;';
	let value = [id];
	client.query(sql, value).then((results) => {
		res.redirect('/myRecords');
	});
}

// Constructors
function Country(data) {
   this.country = data.Country ;
   this.date = data.Date ;
   this.cases = data.Cases;
}

function AllCountries (data){
    this.country = data.Country    ; 
    this.totalConfirmed = data.TotalConfirmed ; 
    this.totalDeaths =  data.TotalDeaths    ;
    this.totalRecovered = data.TotalRecovered   ;
    this.date = data.Date ;
}

client.connect()
    .then(() => {
        app.listen(PORT, () => {

            console.log(`listening on PORT ${PORT}`);
        })
    })