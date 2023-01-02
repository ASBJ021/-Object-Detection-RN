import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import { Camera, CameraType } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, LogBox, Platform, StyleSheet, Text, View } from 'react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
//import { mod } from '@tensorflow/tfjs';
import Canvas from 'react-native-canvas';

const TensorCamera = cameraWithTensors(Camera);
const {width, height} = Dimensions.get('window');

LogBox.ignoreAllLogs(true);
export default function App() {

  const [model,setModel] = useState();
  let context = useRef();
  let canvas = useRef();

  let textureDims = 
    Platform.OS == 'ios'
      ? {height: 1920, width: 1080}
      : {height:1200, width:1600}

  function drawRectangle(predictions, nextImageTensor){
    console.log(predictions)

    if(!context.current || !canvas.current) return;

    const scaleWidth = width/nextImageTensor.shape[1];
    const scaleHeight = width/nextImageTensor.shape[0];

    const fH = Platform.OS == 'ios' ? false: true;

    context.current.clearRect(0,0,width,height);
    

    for (const prediction of predictions){
      const [x,y,width,height] = prediction.bbox;
      const bbx = fH ? canvas.current.width-x *scaleWidth - width * scaleWidth: x*scaleWidth;
      const bby = y*scaleHeight;

      console.log(prediction.class);

      //context.current.strokeRect(bbx,bby,width*scaleWidth,height*scaleHeight);
      context.current.strokeRect(x,y,width,height);
      context.current.strokeText(prediction.class, bbx-5, bby-5);
    }
  }

  function handleCameraStream(images){
    const loop = async() => {
      const nextImageTensor = images.next().value;

      if(!model || !nextImageTensor)
        throw new Error('No model or Image Tensor');
        
      model
        .detect(nextImageTensor)
        .then ((prediction) =>{
          drawRectangle(prediction,nextImageTensor);
        })
        .catch((error)=>{
            console.log(error);
        });

      requestAnimationFrame(loop);

    };loop();
  }

  async function handleCanvas(can){
    can.width = width;
    can.height = height;
    const ctx = can.getContext('2d');
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 1;
    
    context.current=ctx;
    canvas.current=can;
  }

  useEffect(()=>{
    (async () =>{
      const {status} = await Camera.requestCameraPermissionsAsync();
      await tf.ready();
      setModel(await cocoSsd.load());
      console.log('Model Loaded');
    })();

  },[]);

  return (
    <View style={styles.container}>
      
      < TensorCamera
          style = {styles.camera}
          type = {CameraType.back}
          cameraTextureHeight = {textureDims.height}
          cameraTextureWidth = {textureDims.width}
          resizeHeight = {640}
          resizeWidth = {640}
          resizeDepth = {3}
          onReady = {handleCameraStream}
          autorender={true}
          useCustomShadersToResize={false}
          />

        <Canvas style={styles.canvas} ref={handleCanvas} />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  camera: {
    width:'100%',
    height:'100%'
  },
  canvas:{
    position:'absolute',
    zIndex: 100000000,
    width:'100%',
    height:'100%',
    
  },
});
