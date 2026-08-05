import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UploadCloud, Film, Play } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalContext';

export default function UploadVideoScreen({ navigation }) {
  const { refreshGlobalData } = useGlobalContext();
  const [videoName, setVideoName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const API_URL = 'http://192.168.137.1:8000';

  const handleImagePickerResult = (result) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedVideo(result.assets[0]);
      setUploadProgress(0);
    }
  };

  const pickVideo = async () => {
    if (Platform.OS === 'web') {
      try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
        });
        handleImagePickerResult(result);
      } catch (e) {
        console.error("Gallery error: ", e);
      }
      return;
    }

    Alert.alert(
      "Select Video Source",
      "Choose where to pick your video from",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take Video",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permissions are required.');
              return;
            }
            try {
              let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
              });
              handleImagePickerResult(result);
            } catch (e) {
              console.error("Camera error: ", e);
            }
          }
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            try {
              let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
              });
              handleImagePickerResult(result);
            } catch (e) {
              console.error("Gallery error: ", e);
            }
          }
        }
      ]
    );
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video first.');
      return;
    }
    if (!videoName.trim()) {
      Alert.alert('Error', 'Please enter a name for this video.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10); // Start progress
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      const uri = selectedVideo.uri;
      const fileType = 'video/mp4';
      const fileName = selectedVideo.fileName || uri.split('/').pop() || 'upload.mp4';
      
      if (Platform.OS === 'web') {
         const response = await fetch(uri);
         const blob = await response.blob();
         formData.append('file', blob, fileName);
      } else {
         formData.append('file', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            type: fileType,
            name: fileName,
         });
      }

      formData.append('camera_name', videoName);
      formData.append('location', location || 'Unspecified');

      setUploadProgress(30);

      // We use XMLHttpRequest here to potentially get real upload progress, 
      // but fetch is simpler for now, so we simulate progress states.
      setUploadProgress(60);
      const response = await fetch(`${API_URL}/api/cameras/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      setUploadProgress(85);
      const responseData = await response.json();
      
      // Trigger background processing immediately
      await fetch(`${API_URL}/api/cameras/${responseData.id}/process`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setUploadProgress(100);

      setTimeout(() => {
         refreshGlobalData();
         navigation.goBack();
      }, 1500);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to upload video: ' + e.message);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileSizeMB = () => {
    if (!selectedVideo || !selectedVideo.fileSize) return 'Unknown Size';
    return (selectedVideo.fileSize / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDurationSecs = () => {
    if (!selectedVideo || !selectedVideo.duration) return 'Unknown Duration';
    return (selectedVideo.duration / 1000).toFixed(0) + 's';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Video</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity style={styles.uploadArea} onPress={pickVideo} disabled={isUploading}>
          {selectedVideo ? (
            <View style={styles.videoPreviewContainer}>
              <Video
                source={{ uri: selectedVideo.uri }}
                style={styles.videoPreview}
                useNativeControls
                resizeMode="contain"
                isLooping
              />
              <View style={styles.videoInfo}>
                <Text style={styles.videoSelectedText}>{selectedVideo.fileName || 'upload.mp4'}</Text>
                <Text style={styles.videoSelectedSub}>{getFileSizeMB()} • {getDurationSecs()}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <UploadCloud size={48} color="#94A3B8" />
              <Text style={styles.uploadPromptText}>Tap to select a video file</Text>
              <Text style={styles.uploadPromptSub}>Supported formats: MP4, AVI, MOV, MKV</Text>
              <Text style={styles.uploadPromptSub}>Maximum upload size: 500 MB</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.label}>Video Name</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g., Main Entrance Footage"
            placeholderTextColor="#64748B"
            value={videoName}
            onChangeText={setVideoName}
            editable={!isUploading}
          />
          
          <Text style={styles.label}>Location / Context (Optional)</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g., Front Door"
            placeholderTextColor="#64748B"
            value={location}
            onChangeText={setLocation}
            editable={!isUploading}
          />
        </View>

        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {uploadProgress}% - {uploadProgress === 100 ? 'Added successfully!' : 'Processing...'}
            </Text>
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveBtn, (!selectedVideo || !videoName.trim() || isUploading) && styles.saveBtnDisabled]}
          onPress={handleUpload}
          disabled={!selectedVideo || !videoName.trim() || isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator color="#000" style={{marginRight: 10}} />
              <Text style={styles.saveBtnText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Play size={20} color="#000" />
              <Text style={styles.saveBtnText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  
  uploadArea: { height: 260, backgroundColor: '#161B29', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: '#242C3E', borderStyle: 'dashed', overflow: 'hidden' },
  uploadPrompt: { alignItems: 'center', padding: 20 },
  uploadPromptText: { color: '#FFF', fontSize: 16, marginTop: 15, fontWeight: '500' },
  uploadPromptSub: { color: '#64748B', fontSize: 12, marginTop: 6 },
  
  videoPreviewContainer: { width: '100%', height: '100%', backgroundColor: '#000' },
  videoPreview: { width: '100%', height: '75%' },
  videoInfo: { height: '25%', backgroundColor: '#1E293B', padding: 10, justifyContent: 'center', alignItems: 'center' },
  videoSelectedText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  videoSelectedSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  
  form: { gap: 10 },
  label: { color: '#FFF', fontSize: 16, fontWeight: '500', marginBottom: 5 },
  input: { backgroundColor: '#161B29', borderRadius: 12, paddingHorizontal: 15, height: 55, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#242C3E', marginBottom: 15 },
  
  progressContainer: { marginTop: 20, alignItems: 'center' },
  progressBarBg: { width: '100%', height: 10, backgroundColor: '#1E293B', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00E5FF' },
  progressText: { color: '#00E5FF', marginTop: 10, fontWeight: 'bold' },

  footer: { padding: 20, backgroundColor: '#0F172A', borderTopWidth: 1, borderColor: '#1E293B' },
  saveBtn: { backgroundColor: '#00E5FF', height: 55, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveBtnDisabled: { backgroundColor: '#242C3E', opacity: 0.7 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
