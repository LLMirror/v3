import express from 'express';
import utils from '../../utils/index.js';
import fileEvent from '../../utils/file.js';

const router = express.Router();

router.post('/file',async(req,res,next)=>{
    let result=await fileEvent(req,res);
    res.send(utils.returnData({data:result}))
});

export default router;
