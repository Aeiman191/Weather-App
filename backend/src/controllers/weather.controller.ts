import {Request, Response} from "express";

import {
    getCurrentWeather,
    getForecast
} from "../services/weather.service";



export const currentWeather = async(
req:Request,
res:Response
)=>{

    try{

        const {location}=req.query;


        if(!location){
            return res.status(400).json({
                message:"Location required"
            });
        }


        const weather =
        await getCurrentWeather(
            location as string
        );


        res.json(weather);


    }catch(error:any){

        res.status(500).json({
            message:"Unable to fetch weather",
            error:error.message
        });

    }

};




export const forecastWeather = async(
req:Request,
res:Response
)=>{


    try{

        const {location}=req.query;


        if(!location){
            return res.status(400).json({
                message:"Location required"
            });
        }


        const weather =
        await getForecast(
            location as string
        );


        res.json(weather);


    }catch(error:any){

        res.status(500).json({
            message:"Unable to fetch forecast"
        });

    }

};