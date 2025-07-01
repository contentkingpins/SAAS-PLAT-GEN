/**
 * UPS Shipping Service
 * Handles shipping label creation and tracking queries
 */

interface UPSShippingRequest {
  leadId: string;
  recipient: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    phone: string;
  };
  package: {
    weight: string;
    dimensions: string;
    description: string;
  };
}

interface UPSShippingResponse {
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  returnTrackingNumber?: string;
  returnLabelUrl?: string;
  error?: string;
}

interface UPSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class UPSService {
  private accessKey: string;
  private username: string;
  private password: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.accessKey = process.env.UPS_ACCESS_KEY || '';
    this.username = process.env.UPS_USERNAME || '';
    this.password = process.env.UPS_PASSWORD || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://onlinetools.ups.com/api' 
      : 'https://wwwcie.ups.com/api';
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if current token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting UPS OAuth token...');
      
      const response = await fetch(`${this.baseUrl}/security/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-merchant-id': this.accessKey
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`UPS OAuth error: ${response.status} ${errorText}`);
      }

      const tokenData: UPSTokenResponse = await response.json();
      
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('✅ UPS OAuth token obtained successfully');
      return this.accessToken;

    } catch (error) {
      console.error('❌ UPS OAuth error:', error);
      throw new Error(`Failed to get UPS access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create shipping label for test kit
   */
  async createShippingLabel(request: UPSShippingRequest): Promise<UPSShippingResponse> {
    try {
      console.log('🚚 Creating UPS shipping label for lead:', request.leadId);
      
      const accessToken = await this.getAccessToken();
      
      const shippingData = {
        ShipmentRequest: {
          Request: {
            RequestOption: 'nonvalidate',
            TransactionReference: {
              CustomerContext: `Lead-${request.leadId}`
            }
          },
          Shipment: {
            Description: request.package.description,
            Shipper: {
              Name: 'Healthcare Testing Lab',
              AttentionName: 'Shipping Department',
              TaxIdentificationNumber: '123456',
              Phone: {
                Number: '1234567890',
                Extension: ' '
              },
              ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
              Address: {
                AddressLine: ['123 Lab Street'],
                City: 'Atlanta',
                StateProvinceCode: 'GA',
                PostalCode: '30309',
                CountryCode: 'US'
              }
            },
            ShipTo: {
              Name: request.recipient.name,
              AttentionName: request.recipient.name,
              Phone: {
                Number: request.recipient.phone.replace(/\D/g, '').substring(0, 10)
              },
              Address: {
                AddressLine: [request.recipient.address.street],
                City: request.recipient.address.city,
                StateProvinceCode: request.recipient.address.state,
                PostalCode: request.recipient.address.zipCode,
                CountryCode: 'US'
              }
            },
            Service: {
              Code: '03', // UPS Ground
              Description: 'Ground'
            },
            Package: [
              {
                Description: request.package.description,
                Packaging: {
                  Code: '02',
                  Description: 'Package'
                },
                Dimensions: {
                  UnitOfMeasurement: {
                    Code: 'IN',
                    Description: 'Inches'
                  },
                  Length: '12',
                  Width: '8',
                  Height: '4'
                },
                PackageWeight: {
                  UnitOfMeasurement: {
                    Code: 'LBS',
                    Description: 'Pounds'
                  },
                  Weight: request.package.weight
                }
              }
            ]
          },
          LabelSpecification: {
            LabelImageFormat: {
              Code: 'GIF',
              Description: 'GIF'
            },
            HTTPUserAgent: 'HealthcareCRM/1.0'
          }
        }
      };

      // Make API call to UPS
      const response = await fetch(`${this.baseUrl}/shipments/v1/ship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'transId': `lead-${request.leadId}-${Date.now()}`,
          'transactionSrc': 'HealthcareCRM'
        },
        body: JSON.stringify(shippingData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`UPS Shipping API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ UPS shipping label created successfully');
      
      // Extract tracking number and label URL
      const trackingNumber = result.ShipmentResponse?.ShipmentResults?.PackageResults?.[0]?.TrackingNumber;
      const labelUrl = result.ShipmentResponse?.ShipmentResults?.PackageResults?.[0]?.ShippingLabel?.GraphicImage;

      // Create return label automatically
      const returnLabel = await this.createReturnLabel(trackingNumber, request.leadId);

      return {
        success: true,
        trackingNumber,
        labelUrl,
        returnTrackingNumber: returnLabel.trackingNumber,
        returnLabelUrl: returnLabel.labelUrl
      };

    } catch (error) {
      console.error('❌ UPS Shipping API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get tracking information for a package
   */
  async getTrackingInfo(trackingNumber: string) {
    try {
      console.log('📦 Getting UPS tracking info for:', trackingNumber);
      
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/track/v1/details/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`UPS Tracking API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ UPS Tracking API error:', error);
      throw error;
    }
  }

  /**
   * Create return shipping label
   */
  async createReturnLabel(originalTrackingNumber: string, leadId: string): Promise<UPSShippingResponse> {
    try {
      console.log('🔄 Creating UPS return label for lead:', leadId);
      
      const accessToken = await this.getAccessToken();
      
      const returnShipmentData = {
        ShipmentRequest: {
          Request: {
            RequestOption: 'nonvalidate',
            TransactionReference: {
              CustomerContext: `Return-Lead-${leadId}`
            }
          },
          Shipment: {
            Description: 'Medical Test Kit Return',
            ReturnService: {
              Code: '8' // UPS Return Service
            },
            Shipper: {
              Name: 'Healthcare Testing Lab',
              AttentionName: 'Lab Processing',
              ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
              Address: {
                AddressLine: ['123 Lab Street'],
                City: 'Atlanta',
                StateProvinceCode: 'GA',
                PostalCode: '30309',
                CountryCode: 'US'
              }
            },
            ShipTo: {
              Name: 'Healthcare Testing Lab',
              AttentionName: 'Lab Processing',
              Address: {
                AddressLine: ['123 Lab Street'],
                City: 'Atlanta',
                StateProvinceCode: 'GA',
                PostalCode: '30309',
                CountryCode: 'US'
              }
            },
            Service: {
              Code: '03', // UPS Ground
              Description: 'Ground'
            },
            Package: [
              {
                Description: 'Medical Test Kit Return',
                Packaging: {
                  Code: '02',
                  Description: 'Package'
                },
                Dimensions: {
                  UnitOfMeasurement: {
                    Code: 'IN',
                    Description: 'Inches'
                  },
                  Length: '12',
                  Width: '8',
                  Height: '4'
                },
                PackageWeight: {
                  UnitOfMeasurement: {
                    Code: 'LBS',
                    Description: 'Pounds'
                  },
                  Weight: '1.0'
                }
              }
            ]
          },
          LabelSpecification: {
            LabelImageFormat: {
              Code: 'GIF',
              Description: 'GIF'
            },
            HTTPUserAgent: 'HealthcareCRM/1.0'
          }
        }
      };

      const response = await fetch(`${this.baseUrl}/shipments/v1/ship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'transId': `return-${leadId}-${Date.now()}`,
          'transactionSrc': 'HealthcareCRM'
        },
        body: JSON.stringify(returnShipmentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Return label creation failed:', errorText);
        // Don't fail the main shipment if return label fails
        return {
          success: false,
          error: `Return label creation failed: ${response.status}`
        };
      }

      const result = await response.json();
      console.log('✅ UPS return label created successfully');
      
      const returnTrackingNumber = result.ShipmentResponse?.ShipmentResults?.PackageResults?.[0]?.TrackingNumber;
      const returnLabelUrl = result.ShipmentResponse?.ShipmentResults?.PackageResults?.[0]?.ShippingLabel?.GraphicImage;

      return {
        success: true,
        trackingNumber: returnTrackingNumber,
        labelUrl: returnLabelUrl
      };

    } catch (error) {
      console.error('❌ UPS Return Label error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate UPS service configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!this.accessKey || !this.username || !this.password) {
        return { valid: false, error: 'Missing UPS credentials' };
      }

      await this.getAccessToken();
      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Configuration validation failed' 
      };
    }
  }
}

export const upsService = new UPSService();
export type { UPSShippingRequest, UPSShippingResponse }; 