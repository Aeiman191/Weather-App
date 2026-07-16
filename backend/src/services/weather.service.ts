import axios from "axios";


const WEATHER_API =
"https://api.weatherapi.com/v1";


export const getCurrentWeather = async(
    location:string
)=>{

    const response = await axios.get(
        `${WEATHER_API}/current.json`,
        {
            params:{
                key:process.env.WEATHER_API_KEY,
                q:location
            }
        }
    );


    return response.data;

};



export const getForecast = async(
    location:string
)=>{

    const response = await axios.get(
        `${WEATHER_API}/forecast.json`,
        {
            params:{
                key:process.env.WEATHER_API_KEY,
                q:location,
                days:5
            }
        }
    );


    return response.data;

};