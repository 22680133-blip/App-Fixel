import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ReadingsService, Reading } from './readings.service';

export interface SensorData {
  temperatura: number;
  humedad: number | null;
  timestamp: string | null;
  device_code: string;
}

@Injectable({ providedIn: 'root' })
export class SensorService {
  private readonly readingsService = inject(ReadingsService);

  private sensorData$ = new BehaviorSubject<SensorData | null>(null);
  private allReadings$ = new BehaviorSubject<Reading[]>([]);

  private pollingSub: Subscription | null = null;
  private activeDeviceCode = '';

  /** Observable of the latest sensor reading for the active device */
  get latestData$() {
    return this.sensorData$.asObservable();
  }

  /** Observable of all readings for the active device (sorted ascending) */
  get readings$() {
    return this.allReadings$.asObservable();
  }

  /** Start real-time polling for a specific device */
  startPolling(deviceCode: string) {
    this.stopPolling();
    this.activeDeviceCode = deviceCode;

    this.pollingSub = this.readingsService.getRealtimeData().subscribe((data) => {
      if (!data || data.length === 0) return;

      // Filter for active device
      const deviceReadings = this.activeDeviceCode
        ? data.filter(r => r.device_code === this.activeDeviceCode)
        : data;

      const relevant = deviceReadings.length > 0 ? deviceReadings : data;

      // Sort ascending by timestamp
      const sorted = [...relevant].sort((a, b) => {
        const tsA = new Date(a.timestamp || a.created_at || 0).getTime();
        const tsB = new Date(b.timestamp || b.created_at || 0).getTime();
        return tsA - tsB;
      });

      this.allReadings$.next(sorted);

      if (sorted.length > 0) {
        const latest = sorted[sorted.length - 1];
        this.sensorData$.next({
          temperatura: latest.temperatura,
          humedad: latest.humedad ?? null,
          timestamp: latest.timestamp || latest.created_at || null,
          device_code: latest.device_code,
        });
      }
    });
  }

  stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
  }
}
