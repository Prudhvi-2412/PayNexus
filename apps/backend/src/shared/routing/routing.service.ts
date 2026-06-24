import redisService from '../redis/redis';

export interface GatewayRoute {
  name: string;
  weight: number; // default percentage of traffic (e.g. 70, 30)
  status: 'OPERATIONAL' | 'DEGRADED';
  responseTime: number;
}

export class RoutingService {
  private gateways: string[] = ['HDFC', 'ICICI'];
  private defaultWeights: Record<string, number> = {
    HDFC: 70,
    ICICI: 30,
  };

  /**
   * Determine which gateway to route the payment to based on real-time success rates and weights
   */
  public async getGatewayRoute(method: string): Promise<string> {
    // UPI or Netbanking specific overrides (can be added here)
    
    // Evaluate real-time health metrics of each gateway route
    const healthStatus: Record<string, 'OPERATIONAL' | 'DEGRADED'> = {};
    let activeRoutes: string[] = [];

    for (const gateway of this.gateways) {
      const stats = await redisService.getGatewayStats(gateway);
      const total = stats.success + stats.failure;
      
      // If we have at least 5 transactions and success rate drops below 80%
      if (total >= 5) {
        const successRate = (stats.success / total) * 100;
        if (successRate < 80) {
          healthStatus[gateway] = 'DEGRADED';
          console.warn(`[Smart Router] Gateway route "${gateway}" health degraded: Success rate is ${successRate.toFixed(1)}%`);
        } else {
          healthStatus[gateway] = 'OPERATIONAL';
          activeRoutes.push(gateway);
        }
      } else {
        // Fallback to operational if volume is too low to judge
        healthStatus[gateway] = 'OPERATIONAL';
        activeRoutes.push(gateway);
      }
    }

    // Failover: if one route is degraded, shift 100% traffic to the healthy route
    if (activeRoutes.length === 1) {
      console.log(`[Smart Router] Failover active. Routing 100% traffic to healthy route: ${activeRoutes[0]}`);
      return activeRoutes[0];
    }

    // Failover: if all routes are degraded, keep HDFC as primary fallback
    if (activeRoutes.length === 0) {
      console.warn('[Smart Router] All gateway routes degraded. Using default primary route HDFC.');
      return 'HDFC';
    }

    // Weighted random selection between active/healthy routes
    const rand = Math.random() * 100;
    const hdfcWeight = this.defaultWeights['HDFC'];
    
    if (rand <= hdfcWeight) {
      return 'HDFC';
    } else {
      return 'ICICI';
    }
  }

  public async reportSuccess(gateway: string): Promise<void> {
    await redisService.recordGatewayTransaction(gateway, 'SUCCESS');
  }

  public async reportFailure(gateway: string): Promise<void> {
    await redisService.recordGatewayTransaction(gateway, 'FAILURE');
  }

  /**
   * Returns current health dashboard info for the UI
   */
  public async getRouteStatusReport() {
    const report = [];
    for (const gw of this.gateways) {
      const stats = await redisService.getGatewayStats(gw);
      const total = stats.success + stats.failure;
      const rate = total > 0 ? (stats.success / total) * 100 : 100;
      report.push({
        gateway: gw,
        successRate: rate.toFixed(1) + '%',
        totalTxCount: total,
        status: total >= 5 && rate < 80 ? 'DEGRADED' : 'OPERATIONAL',
      });
    }
    return report;
  }
}

export const routingService = new RoutingService();
export default routingService;
