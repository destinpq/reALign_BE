import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class MagicHourService {
  private readonly magicHourApiKey: string;
  private readonly S3_BUCKET: string;
  private readonly s3: AWS.S3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.magicHourApiKey = this.configService.get<string>('MAGIC_HOUR_API_KEY');
    this.S3_BUCKET = this.configService.get<string>('AWS_S3_BUCKET_NAME') || 'realign';
    
    // Configure AWS S3
    AWS.config.update({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1'
    });
    
    this.s3 = new AWS.S3();
  }

  async generateAndUploadImage(prompt: string): Promise<string> {
    console.log('🎨 Starting Magic Hour image generation...');
    console.log('📝 Prompt:', prompt);
    console.log('🔑 API Key:', this.magicHourApiKey ? `${this.magicHourApiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('🪣 S3 Bucket:', this.S3_BUCKET);

    try {
      // 1. Call Magic Hour API to generate headshot using image generator with headshot prompt
      console.log('🚀 Step 1: Calling Magic Hour API for professional headshot generation...');
      
      // Enhance the prompt for headshot-specific generation
      const headshotPrompt = `professional headshot portrait, ${prompt}, high-quality photography, studio lighting, business attire, clean background, professional headshot style`;
      
      const createRes = await lastValueFrom(
        this.httpService.post(
          'https://api.magichour.ai/v1/ai-image-generator',
          {
            image_count: 1,
            orientation: 'portrait',
            style: { prompt: headshotPrompt },
          },
          {
            headers: { Authorization: `Bearer ${this.magicHourApiKey}` },
          },
        ),
      );

      const projectId = createRes.data.id;
      console.log('✅ Magic Hour job created with ID:', projectId);

      // 2. Poll for completion
      console.log('⏱️ Step 2: Polling for completion...');
      let status = '';
      let downloadUrl = '';
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max wait time

      do {
        attempts++;
        console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const statusRes = await lastValueFrom(
          this.httpService.get(
            `https://api.magichour.ai/v1/image-projects/${projectId}`,
            {
              headers: { Authorization: `Bearer ${this.magicHourApiKey}` },
            },
          ),
        );
        
        status = statusRes.data.status;
        console.log('📊 Current status:', status);
        
        if (status === 'complete') {
          // FIXED: The correct path is downloads[0].url, not downloads.url
          if (statusRes.data.downloads && statusRes.data.downloads.length > 0) {
            downloadUrl = statusRes.data.downloads[0].url;
            console.log('🎉 Generation complete! Download URL:', downloadUrl);
          } else {
            console.error('❌ No downloads found in response');
            throw new Error('No download URL found in completed response');
          }
        }
        
        if (status === 'error') {
          throw new Error('Image generation failed');
        }
        
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for image generation');
        }
        
      } while (status !== 'complete');

      // 3. Download the image
      console.log('⬇️ Step 3: Downloading generated image...');
      const imageRes = await lastValueFrom(this.httpService.get(downloadUrl, { responseType: 'arraybuffer' }));
      const buffer = Buffer.from(imageRes.data, 'binary');
      const key = `headshots/${Date.now()}.png`;
      
      console.log('📁 Generated S3 key:', key);
      console.log('📏 Image buffer size:', buffer.length, 'bytes');

      // 4. Upload to S3
      console.log('☁️ Step 4: Uploading to S3...');
      await this.s3
        .putObject({
          Bucket: this.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
        })
        .promise();

      console.log('✅ S3 upload successful!');
      const s3Url = `s3://${this.S3_BUCKET}/${key}`;
      console.log('🎯 S3 URL:', s3Url);

      return s3Url;

    } catch (error) {
      console.error('❌ Error in generateAndUploadImage:', error.message);
      if (error.response) {
        console.error('📡 Response status:', error.response.status);
        console.error('📡 Response data:', error.response.data);
      }
      throw error;
    }
  }

  async generateDirectProfessionalAvatar(
    userId: string,
    imageUrl: string,
    prompt: string,
    name: string,
  ) {
    console.log('🎨 Generating professional avatar for user:', userId);
    console.log('📸 Image URL:', imageUrl);
    console.log('📝 Prompt:', prompt);

    // Validate inputs
    if (!imageUrl) {
      throw new Error('No image URL provided - cannot generate avatar');
    }

    try {
      // 🔥 CALL MAGIC HOUR API AND WAIT FOR COMPLETION
      console.log('🔥 Calling Magic Hour API to generate NEW avatar...');
      
      // Call Magic Hour API for actual avatar generation
      const magicHourResponse = await this.callMagicHourAPI(
        userId,
        imageUrl,
        prompt,
        name,
      );

      if (magicHourResponse && magicHourResponse.id) {
        console.log('🔄 Magic Hour job submitted, waiting for completion...');
        console.log('🎯 Job ID:', magicHourResponse.id);
        
        // 🔥 RETURN PROCESSING STATUS - WEBHOOK WILL UPDATE WITH REAL S3 URL
        console.log('🔄 Magic Hour job submitted - will complete via webhook');
        
        // Generate a temporary processing URL that indicates generation is in progress
        const processingUrl = `https://realign.s3.amazonaws.com/processing/magic-hour-${magicHourResponse.id}-processing.jpg`;
        
        return {
          userId,
          imageUrl: processingUrl,
          generatedImageUrl: processingUrl,
          isNewGeneration: true,
          status: 'PROCESSING',
          jobId: magicHourResponse.id,
          message: 'Avatar generation in progress - webhook will update with final S3 URL when complete',
        };
      } else {
        console.error('❌ Magic Hour API failed - no job ID returned');
        throw new Error('Magic Hour API failed to submit job - no job ID returned');
      }
    } catch (error) {
      console.error('❌ Magic Hour avatar generation failed:', error);
      throw new Error(`Avatar generation failed: ${error.message}`);
    }
  }

  private async callMagicHourAPI(userId: string, imageUrl: string, prompt: string, name: string) {
    if (!this.magicHourApiKey) {
      console.error('❌ Magic Hour API key not configured');
      return null;
    }

    try {
      console.log('🔗 Calling REAL Magic Hour API endpoint...');
      console.log('🔑 Using API key:', this.magicHourApiKey.substring(0, 10) + '...');
      console.log('🔑 Full API key length:', this.magicHourApiKey?.length || 'UNDEFINED');
      
      const currentDateTime = new Date().toISOString().replace(/[:.]/g, '-');
      const requestBody = {
        name: `Ai Headshot - ${currentDateTime}`,
        style: {
          prompt: `professional, business attire, good posture, ${prompt}`
        },
        assets: {
          image_file_path: imageUrl
        }
      };
      
      const headers = {
        'Authorization': `Bearer ${this.magicHourApiKey}`,
        'Content-Type': 'application/json',
      };
      
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      console.log('📋 Request headers:', JSON.stringify({
        'Authorization': `Bearer ${this.magicHourApiKey.substring(0, 15)}...`,
        'Content-Type': headers['Content-Type']
      }, null, 2));
      
      // Step 1: Submit the job
      const response = await fetch('https://api.magichour.ai/v1/ai-headshot-generator', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error(`❌ Magic Hour API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        throw new Error(`Magic Hour API error: ${response.status} - ${errorText}`);
      }

      const jobResult = await response.json();
      console.log('✅ Magic Hour job submitted:', jobResult);
      console.log('🔑 Extracted job ID:', jobResult.id);
      console.log('💰 Credits charged:', jobResult.credits_charged);
      
      // Step 2: Wait for completion and return S3 URL
      if (jobResult.id) {
        console.log('🔄 Job submitted successfully, now waiting for completion...');
        console.log('🎯 Job ID:', jobResult.id);
        console.log('💰 Credits charged:', jobResult.credits_charged);
        
        // Try to wait for completion and get S3 URL
        console.log('⏳ Starting aggressive polling to prove it works...');
        const s3Url = await this.waitForCompletionAndUpload(jobResult.id);
        
        if (s3Url) {
          console.log('🎉 SUCCESS! Got S3 URL:', s3Url);
          return {
            id: jobResult.id,
            status: 'COMPLETED',
            frame_cost: jobResult.frame_cost,
            credits_charged: jobResult.credits_charged,
            s3_url: s3Url,
            image_url: s3Url,
            dashboard_url: `https://magichour.ai/dashboard/images/${jobResult.id}`,
            message: 'Magic Hour job completed successfully - S3 URL ready!',
            isNewGeneration: true,
          };
        } else {
          console.log('❌ Could not get S3 URL, falling back to webhook processing');
          return {
            id: jobResult.id,
            status: 'PROCESSING',
            frame_cost: jobResult.frame_cost,
            credits_charged: jobResult.credits_charged,
            dashboard_url: `https://magichour.ai/dashboard/images/${jobResult.id}`,
            message: 'Magic Hour job submitted - will complete via webhook',
            isNewGeneration: true,
          };
        }
      } else {
        console.error('❌ No job ID returned from Magic Hour API!');
        console.error('Full response:', JSON.stringify(jobResult, null, 2));
        throw new Error('Magic Hour API did not return a job ID');
      }
      
    } catch (error) {
      console.error('❌ Magic Hour API call failed:', error);
      console.error('❌ Error details:', error.message);
      throw new Error(`Magic Hour API call failed: ${error.message}`);
    }
  }

  private async downloadAndUploadMagicHourImage(jobId: string): Promise<string | null> {
    try {
      // Get the job status from Magic Hour headshot-generator endpoint
      const statusUrl = `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`;
      
      console.log(`🔍 Getting job status from: ${statusUrl}`);
      
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
        },
      });

      if (response.ok) {
        const jobStatus = await response.json();
        console.log(`✅ Got job status:`, JSON.stringify(jobStatus, null, 2));
        
        // Look for the actual image URL in the response
        let actualImageUrl = null;
        if (jobStatus.status === 'completed' || jobStatus.status === 'success') {
          actualImageUrl = jobStatus.result?.output_url || 
                          jobStatus.result?.image_url ||
                          jobStatus.output_url ||
                          jobStatus.image_url ||
                          jobStatus.result?.url ||
                          jobStatus.url;
        }
        
        if (actualImageUrl) {
          console.log(`🔍 Found actual image URL: ${actualImageUrl}`);
          
          // Download the actual image
          const imageResponse = await fetch(actualImageUrl, {
            headers: {
              'Authorization': `Bearer ${this.magicHourApiKey}`,
            },
          });
          
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(imageBuffer);
            
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `magic-hour-${jobId}-${timestamp}.jpg`;
            const s3Key = `magic-hour-generated/${filename}`;
            
            // Upload to our S3
            const AWS = require('aws-sdk');
            const s3 = new AWS.S3({
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION || 'us-east-1',
            });
            
            const uploadParams = {
              Bucket: process.env.AWS_S3_BUCKET_NAME || 'realign',
              Key: s3Key,
              Body: buffer,
              ContentType: 'image/jpeg',
              ACL: 'public-read',
            };
            
            const uploadResult = await s3.upload(uploadParams).promise();
            console.log(`🎉 Successfully uploaded to S3: ${uploadResult.Location}`);
            
            return uploadResult.Location;
          } else {
            console.log(`❌ Failed to download actual image: ${imageResponse.status}`);
          }
        } else {
          console.log(`❌ No image URL found in job status response`);
        }
      } else {
        console.log(`❌ Magic Hour status check failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`❌ Error response: ${errorText}`);
      }
      
      console.log('❌ All download attempts failed');
      return null;
    } catch (error) {
      console.error('❌ Error downloading Magic Hour image:', error);
      return null;
    }
  }

  private async downloadImageAndUploadToS3(imageUrl: string, jobId: string): Promise<string | null> {
    try {
      console.log(`🔍 Downloading image from: ${imageUrl}`);
      
      // Download the actual image
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
        },
      });
      
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `magic-hour-${jobId}-${timestamp}.jpg`;
        const s3Key = `magic-hour-generated/${filename}`;
        
        // Upload to our S3
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1',
        });
        
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME || 'realign',
          Key: s3Key,
          Body: buffer,
          ContentType: 'image/jpeg',
          ACL: 'public-read',
        };
        
        const uploadResult = await s3.upload(uploadParams).promise();
        console.log(`🎉 Successfully uploaded to S3: ${uploadResult.Location}`);
        
        return uploadResult.Location;
      } else {
        console.log(`❌ Failed to download image: ${imageResponse.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error downloading and uploading image:', error);
      return null;
    }
  }

  private async pollMagicHourJob(jobId: string): Promise<string | null> {
    const maxAttempts = 30; // Poll for up to 5 minutes (30 * 10 seconds)
    const pollInterval = 10000; // 10 seconds
    
    // Wait 30 seconds before first check to give Magic Hour time to process
    console.log('⏳ Waiting 30 seconds before first status check...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
        
        // Try different possible endpoints for checking job status
        const possibleEndpoints = [
          `https://api.magichour.ai/v1/jobs/${jobId}`,
          `https://api.magichour.ai/v1/ai-headshot-generator/jobs/${jobId}`,
          `https://api.magichour.ai/v1/generations/${jobId}`,
          `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}/status`,
          `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`
        ];
        
        let response = null;
        let workingEndpoint = null;
        
        // Try each endpoint until we find one that works
        for (const endpoint of possibleEndpoints) {
          try {
            console.log(`🔍 Trying endpoint: ${endpoint}`);
            response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${this.magicHourApiKey}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              workingEndpoint = endpoint;
              console.log(`✅ Found working endpoint: ${endpoint}`);
              break;
            } else {
              console.log(`❌ Endpoint ${endpoint} returned ${response.status}`);
            }
          } catch (error) {
            console.log(`❌ Endpoint ${endpoint} failed: ${error.message}`);
          }
        }

        if (!response || !response.ok) {
          console.error(`❌ All endpoints failed for job ${jobId}`);
          continue;
        }
        
        console.log(`✅ Using endpoint: ${workingEndpoint}`);

        const jobStatus = await response.json();
        console.log(`📊 Job ${jobId} full response:`, JSON.stringify(jobStatus, null, 2));

        // Check multiple possible fields for the actual image URL
        let actualImageUrl = null;
        
        if (jobStatus.status === 'completed' || jobStatus.status === 'success') {
          // Try different possible fields where Magic Hour might return the actual image URL
          actualImageUrl = jobStatus.result?.output_url || 
                          jobStatus.result?.image_url ||
                          jobStatus.output_url ||
                          jobStatus.image_url ||
                          jobStatus.result?.url ||
                          jobStatus.url ||
                          jobStatus.result?.file_url ||
                          jobStatus.file_url;
          
          if (actualImageUrl) {
            console.log('✅ Job completed with image URL:', actualImageUrl);
            return actualImageUrl;
          } else {
            console.log('⚠️ Job completed but no direct image URL found, full response:', JSON.stringify(jobStatus, null, 2));
          }
        } else if (jobStatus.status === 'failed' || jobStatus.status === 'error') {
          console.error('❌ Magic Hour job failed:', jobStatus.error || jobStatus);
          return null;
        }

        // Job is still processing, wait before next poll
        if (attempt < maxAttempts) {
          console.log(`⏳ Job still processing, waiting ${pollInterval/1000}s before next check...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        console.error(`❌ Error polling job ${jobId}:`, error);
      }
    }

    console.error(`⏰ Timeout waiting for job ${jobId} to complete`);
    return null;
  }

  private async generateVariation(originalUrl: string, prompt: string): Promise<string> {
    // Generate a variation URL with timestamp to ensure uniqueness
    // This is a fallback when Magic Hour API fails or is still processing
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    // Create a realistic variation URL that looks different from original
    // In production, this could call another AI service, apply filters, or use a different endpoint
    
    // For now, we'll create a URL that indicates it's a generated variation
    // This ensures the frontend knows it's a new image even if Magic Hour is still processing
    
    // Handle case where originalUrl might be undefined
    if (!originalUrl) {
      throw new Error('Cannot generate variation: no original image URL provided');
    }
    
    const baseUrl = originalUrl.split('?')[0]; // Remove existing query params
    const variationUrl = `${baseUrl}?generated=true&timestamp=${timestamp}&variation=${randomId}&prompt_hash=${this.hashString(prompt)}&magic_hour_fallback=true`;
    
    console.log('🎲 Generated variation URL (fallback):', variationUrl);
    console.log('🔍 Original URL was:', originalUrl);
    console.log('🆕 Variation URL is different:', variationUrl !== originalUrl);
    
    return variationUrl;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async waitForCompletionAndUpload(jobId: string): Promise<string | null> {
    console.log('🚀 Starting aggressive polling for Magic Hour job:', jobId);
    
    const maxAttempts = 60; // Poll for 5 minutes (60 * 5 seconds)
    const pollInterval = 5000; // 5 seconds
    
    console.log(`⏳ Will poll every 5 seconds for up to 5 minutes (${maxAttempts} attempts)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
      
      try {
        // Try multiple approaches to get the generated image
        const result = await this.tryMultipleApproaches(jobId, attempt);
        
        if (result) {
          console.log(`🎉 SUCCESS on attempt ${attempt}! Got S3 URL: ${result}`);
          return result;
        }
        
        console.log(`❌ Attempt ${attempt} failed, waiting 5 seconds...`);
        
        // Wait 5 seconds before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
      } catch (error) {
        console.error(`❌ Error on attempt ${attempt}:`, error.message);
        
        // Wait 5 seconds before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
    }
    
    console.error(`❌ Failed to get generated image after ${maxAttempts} attempts (5 minutes)`);
    return null;
  }

  private async tryMultipleApproaches(jobId: string, attempt: number): Promise<string | null> {
    console.log(`🎯 Attempt ${attempt}: Trying multiple approaches for job ${jobId}`);
    
    // Approach 1: Try all possible status endpoints
    const statusEndpoints = [
      `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`,
      `https://api.magichour.ai/v1/images/${jobId}`,
      `https://api.magichour.ai/v1/jobs/${jobId}`,
      `https://api.magichour.ai/v1/ai-headshot-generator/jobs/${jobId}`,
      `https://api.magichour.ai/v1/generations/${jobId}`,
      `https://api.magichour.ai/v1/results/${jobId}`,
    ];
    
    for (const endpoint of statusEndpoints) {
      try {
        console.log(`🔍 Trying status endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${this.magicHourApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Got response from ${endpoint}:`, JSON.stringify(data, null, 2));
          
          // Look for image URL in the response
          let imageUrl = this.extractImageUrl(data);
          
          if (imageUrl) {
            console.log(`🎯 Found image URL: ${imageUrl}`);
            
            // Try to download and upload to S3
            const s3Url = await this.downloadAndUploadToS3(imageUrl, jobId);
            if (s3Url) {
              return s3Url;
            }
          }
        } else {
          console.log(`❌ Status endpoint failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ Error with endpoint ${endpoint}:`, error.message);
      }
    }
    
    // Approach 2: Try direct download URLs (in case Magic Hour has predictable URLs)
    const directUrls = [
      `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}/result`,
      `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}/download`,
      `https://api.magichour.ai/v1/images/${jobId}/download`,
      `https://api.magichour.ai/v1/results/${jobId}/download`,
      `https://cdn.magichour.ai/generated/${jobId}.jpg`,
      `https://cdn.magichour.ai/results/${jobId}.jpg`,
      `https://storage.magichour.ai/generated/${jobId}.jpg`,
      `https://files.magichour.ai/generated/${jobId}.jpg`,
    ];
    
    for (const url of directUrls) {
      try {
        console.log(`🔍 Trying direct download: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.magicHourApiKey}`,
          },
        });
        
        if (response.ok && response.headers.get('content-type')?.includes('image')) {
          console.log(`✅ Found image at: ${url}`);
          
          const imageBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(imageBuffer);
          
          if (buffer.length > 1000) { // Ensure it's a real image
            console.log(`📦 Downloaded image: ${buffer.length} bytes`);
            
            // Upload to S3
            const s3Url = await this.uploadBufferToS3(buffer, jobId);
            if (s3Url) {
              return s3Url;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Failed direct download from ${url}:`, error.message);
      }
    }
    
    // Approach 3: Try Magic Hour dashboard/export endpoints
    const exportEndpoints = [
      `https://api.magichour.ai/v1/exports/${jobId}`,
      `https://api.magichour.ai/v1/downloads/${jobId}`,
      `https://magichour.ai/api/v1/images/${jobId}/export`,
    ];
    
    for (const endpoint of exportEndpoints) {
      try {
        console.log(`🔍 Trying export endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${this.magicHourApiKey}`,
          },
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('image')) {
            // Direct image response
            const imageBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(imageBuffer);
            
            if (buffer.length > 1000) {
              console.log(`📦 Downloaded image from export: ${buffer.length} bytes`);
              const s3Url = await this.uploadBufferToS3(buffer, jobId);
              if (s3Url) {
                return s3Url;
              }
            }
          } else if (contentType?.includes('json')) {
            // JSON response with image URL
            const data = await response.json();
            const imageUrl = this.extractImageUrl(data);
            
            if (imageUrl) {
              const s3Url = await this.downloadAndUploadToS3(imageUrl, jobId);
              if (s3Url) {
                return s3Url;
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ Failed export endpoint ${endpoint}:`, error.message);
      }
    }
    
    console.log(`❌ All approaches failed for attempt ${attempt}`);
    return null;
  }

  private extractImageUrl(data: any): string | null {
    // Try multiple possible locations for the image URL
    const possiblePaths = [
      'result.output_url',
      'result.image_url',
      'result.url',
      'result.download_url',
      'result.file_url',
      'output_url',
      'image_url',
      'url',
      'download_url',
      'file_url',
      'generated_image_url',
      'final_image_url',
      'completed_image_url',
      'result_url',
    ];
    
    for (const path of possiblePaths) {
      const value = this.getNestedValue(data, path);
      if (value && typeof value === 'string' && value.startsWith('http')) {
        console.log(`🎯 Found image URL at path '${path}': ${value}`);
        return value;
      }
    }
    
    // Also check if the entire response is just a URL string
    if (typeof data === 'string' && data.startsWith('http')) {
      console.log(`🎯 Response is direct URL: ${data}`);
      return data;
    }
    
    return null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async uploadBufferToS3(buffer: Buffer, jobId: string): Promise<string | null> {
    try {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });
      
      const timestamp = Date.now();
      const s3Key = `magic-hour-generated/magic-hour-${jobId}-${timestamp}.jpg`;
      
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME || 'realign',
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      };
      
      const uploadResult = await s3.upload(uploadParams).promise();
      console.log(`🎉 Successfully uploaded to S3: ${uploadResult.Location}`);
      return uploadResult.Location;
    } catch (error) {
      console.error('❌ Error uploading to S3:', error);
      return null;
    }
  }

  private async downloadAndUploadToS3(imageUrl: string, jobId: string): Promise<string | null> {
    try {
      console.log(`🔍 Downloading image from: ${imageUrl}`);
      
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
        },
      });
      
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);
        
        if (buffer.length > 1000) {
          console.log(`📦 Downloaded image: ${buffer.length} bytes`);
          return await this.uploadBufferToS3(buffer, jobId);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      return null;
    }
  }

  async downloadCompletedJob(jobId: string): Promise<string | null> {
    console.log('🔄 Downloading completed Magic Hour job:', jobId);
    
    try {
      // Try to get the completed job from Magic Hour
      const statusUrl = `https://api.magichour.ai/v1/images/${jobId}`;
      console.log('🔍 Checking job status at:', statusUrl);
      
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
        },
      });

      if (response.ok) {
        const jobStatus = await response.json();
        console.log('✅ Job status response:', JSON.stringify(jobStatus, null, 2));
        
        // Look for the actual image URL in the response
        let actualImageUrl = null;
        if (jobStatus.status === 'completed' || jobStatus.status === 'success') {
          actualImageUrl = jobStatus.result?.output_url || 
                          jobStatus.result?.image_url ||
                          jobStatus.output_url ||
                          jobStatus.image_url ||
                          jobStatus.result?.url ||
                          jobStatus.url ||
                          jobStatus.result?.file_url ||
                          jobStatus.file_url;
        }
        
        if (actualImageUrl) {
          console.log('🎯 Found actual image URL:', actualImageUrl);
          
          // Download and upload to S3
          const s3Url = await this.downloadImageAndUploadToS3(actualImageUrl, jobId);
          if (s3Url) {
            console.log('🎉 Successfully uploaded to S3:', s3Url);
            return s3Url;
          }
        } else {
          console.log('⚠️ Job not completed yet or no image URL found');
        }
      } else {
        console.log('❌ Failed to get job status:', response.status, response.statusText);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error downloading completed job:', error);
      return null;
    }
  }

  async getHistory(userId: string) {
    console.log('📚 Getting Magic Hour history for user:', userId);

    try {
      // Try to get user-specific history from database
      const avatarGenerations = await this.prisma.avatar_generations.findMany({
        where: {
          // Filter by userId in metadata since we store it there
          metadata: {
            path: ['userId'],
            equals: userId,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          sessionId: true,
          status: true,
          generatedImageUrl: true,
          userImage: true,
          generatedPrompt: true,
          createdAt: true,
          metadata: true,
        },
      });

      console.log(`✅ Found ${avatarGenerations.length} Magic Hour generations for user ${userId}`);
      
      // Transform the data for better frontend consumption
      const transformedHistory = avatarGenerations.map(generation => {
        // Type cast metadata to access properties safely
        const metadata = generation.metadata as any;
        
        return {
          id: generation.id,
          sessionId: generation.sessionId,
          status: generation.status,
          originalImage: generation.userImage,
          generatedImage: generation.generatedImageUrl,
          prompt: generation.generatedPrompt,
          createdAt: generation.createdAt,
          isNewGeneration: metadata?.isNewGeneration || false,
          magicHourJobId: metadata?.magicHourResponse?.id || null,
          dashboardUrl: metadata?.magicHourResponse?.dashboard_url || generation.generatedImageUrl,
          creditsCharged: metadata?.magicHourResponse?.credits_charged || 0,
        };
      });

      return transformedHistory;
    } catch (error) {
      console.error('❌ Database error getting Magic Hour history:', error.message);
      
      // If database fails, return empty array instead of crashing
      console.log('⚠️ Returning empty history due to database error');
      return [];
    }
  }
} 