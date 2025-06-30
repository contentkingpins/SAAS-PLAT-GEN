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
  error?: string;
}

class UPSService {
  private accessKey: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor() {
    this.accessKey = process.env.UPS_ACCESS_KEY || '';
    this.username = process.env.UPS_USERNAME || '';
    this.password = process.env.UPS_PASSWORD || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://onlinetools.ups.com/api' 
      : 'https://wwwcie.ups.com/api';
  }

  /**
   * Create shipping label for test kit
   */
  async createShippingLabel(request: UPSShippingRequest): Promise<UPSShippingResponse> {
    try {
      // TODO: Implement UPS Shipping API call
      console.log('🚚 Creating UPS shipping label for lead:', request.leadId);
      
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
              FaxNumber: '1234567890',
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
                Number: request.recipient.phone
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
            HTTPUserAgent: 'Mozilla/4.5'
          }
        }
      };

      // Make API call to UPS
      const response = await fetch(`${this.baseUrl}/shipments/v1/ship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessKey}`,
          'Content-Type': 'application/json',
          'transId': `lead-${request.leadId}-${Date.now()}`,
          'transactionSrc': 'testing'
        },
        body: JSON.stringify(shippingData)
      });

      if (!response.ok) {
        throw new Error(`UPS API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract tracking number and label URL
      const trackingNumber = result.ShipmentResponse?.ShipmentResults?.PackageResults?.[0]?.TrackingNumber;
      const labelUrl = result.ShipmentResponse?.ShipmentResults?.PackageResults?.[0]?.ShippingLabel?.GraphicImage;

      return {
        success: true,
        trackingNumber,
        labelUrl
      };

    } catch (error) {
      console.error('UPS Shipping API error:', error);
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
      
      const response = await fetch(`${this.baseUrl}/track/v1/details/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`UPS Tracking API error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('UPS Tracking API error:', error);
      throw error;
    }
  }

  /**
   * Create return shipping label
   */
  async createReturnLabel(originalTrackingNumber: string, leadId: string): Promise<UPSShippingResponse> {
    try {
      console.log('🔄 Creating UPS return label for lead:', leadId);
      
      // TODO: Implement return label creation
      // This would create a prepaid return label for the patient to send the kit back
      
      return {
        success: true,
        trackingNumber: `1Z999BB${Date.now()}`, // Placeholder
        labelUrl: 'https://ups.com/return-label.pdf'
      };

    } catch (error) {
      console.error('UPS Return Label error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const upsService = new UPSService();
export type { UPSShippingRequest, UPSShippingResponse }; 