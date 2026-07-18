import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./utils/prisma";
import weatherRoutes from "./routes/weather.routes";
import videoRoutes from "./routes/video.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    "/api/weather",
    weatherRoutes
);

app.use("/api/videos", videoRoutes);

app.get("/health", (req, res) => {
    res.json({
        message: "Weather API server running"
    });
});


const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


app.get("/database-test", async(req,res)=>{

    const locations = await prisma.location.findMany();

    res.json(locations);

});