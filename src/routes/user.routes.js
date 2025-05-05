import { Router } from "express";
import {loginUser, logoutUser, refreshAccessToken, registerUser} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middlewares.js";
import {verifyJWt} from "../middlewares/user.middlewares.js"
const router = Router()

router.route("/register").post(upload.fields([ 
    {name : "avatar" , maxCount: 1 }, 
    { name : "coverimage" , maxCount : 1}]) ,
    registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWt , logoutUser)
router.route("/refreshtoken").post(refreshAccessToken)


export default router