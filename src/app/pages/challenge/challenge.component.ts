import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { BarSeriesOption, EChartsOption, LineSeriesOption } from 'echarts';
import moment from 'moment';

import { Asset } from '../../models/asset.model';
import { ChallengeService } from '../../services/challenge.service';
import challengeData from '../../dataset.json';

moment.locale('fr');

interface SystemStackChart {
  id: string;
  options: EChartsOption;
}

interface PieData {
  name: string;
  value: number;
}

@Component({
  selector: 'app-challenge',
  templateUrl: './challenge.component.html',
  styleUrls: ['./challenge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChallengeComponent implements AfterViewInit {
  public systemByEnvOpts: EChartsOption;
  public assetsBySystemOpts: EChartsOption;
  public systemsStackedCharts: SystemStackChart[];
  public machinesOutputsOpts: EChartsOption;
  private systemsIdsForStackedChart = ["sys002", "sys005", "sys006", "sys007"];
  private systemsIdsForAssetPieChart = ["sys005", "sys006", "sys007", "sys008", "sys009", "sys010", "sys011", "sys012", "sys013"];
  private machines: Asset[];
  constructor(
    private cdkRef: ChangeDetectorRef,
    private challengeService: ChallengeService
  ) {
  }

  //Pas besoin de toucher a l'initialisation
  ngAfterViewInit(): void {
    this.machines = this.challengeService.getAssets.filter(asset => asset.system_ids.includes("sys005"));
    this.systemByEnvOpts = {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2
          },
          data: this.systemByEnvData
        }
      ]
    }
    this.assetsBySystemOpts = {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2
          },
          data: this.assetBySystemData
        }
      ]
    }
    this.systemsStackedCharts = this.systemsIdsForStackedChart.map(system_id => {
      return {
        id: system_id,
        options: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (value) => `${value}°C`
          },
          legend: {
            data: this.getAssetNamesForSystem(system_id)
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: this.xAxisByHours,
          },
          yAxis: {
            type: 'value'
          },
          series: this.getTemperaturesByAssetForSystem(system_id)
        }
      }
    });
    this.machinesOutputsOpts = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: this.xAxisByDays
      },
      yAxis: {
        type: 'value'
      },
      series: this.machines.map(machine => this.getSerieForMachine(machine))
    }
    this.cdkRef.detectChanges();
  }

  getSystemName(system_id: string): string {
    return this.challengeService.getSystem(system_id)?.name;
  }

  /**
   * DONE: Récupérer le nombre de systemes par environnement
   * @returns {PieData[]} sous la forme [{name, value}]
   */
  get systemByEnvData(): PieData[] {
    let result = [];

    for (let i = 0; i < challengeData.environments.length; i++) {
        let envId;
        let envName;
        let counter = 0;
      Object.entries(challengeData.environments[i]).forEach(([key, value]) => {
        if (key == 'id') {
          envId = value;
        }
        else {
          envName = value;
          for (let j = 0; j < challengeData.systems.length; j++) {
            Object.entries(challengeData.systems[j]).forEach(([key, value]) => {
              if (value == envId) {
                counter++;
              }
            });
          }
          result.push({value: counter, name: envName});
        }
      });
    }

    return result;
  }

  /**
   * DONE: Récupérer le nombre d'assets par systeme depuis this.systemsIdsForAssetPieChart
   * @returns {PieData[]} sous la forme [{name, value}]
   */
  get assetBySystemData(): PieData[] {
    let result = [];

    let entryName;

    Object.entries(this.systemsIdsForAssetPieChart).forEach(([key, value]) => {
      let i = 0;
      let counter = 0;
      entryName = value;

      Object.entries(challengeData.assets).forEach(element => {
        if (element[1].system_ids.includes(entryName)) {
          counter++;
        }
      });
      i++;
      result.push({value: counter, name: entryName});
    });

    return result;
  }

  /**
   * Renvoie les premières 24h de la timeframe
   */
  get xAxisByHours(): string[] {
    return this.challengeService.timeframe.map(hour => moment(hour).format('lll')).slice(0, 24);
  }

  /**
   * DONE: récupérer les jours depuis challengeService.timeframe
   * tip: utiliser moment(hour).format('LL') pour récupérer le jour pour une heure donnée
   */
  get xAxisByDays(): string[] {
    return this.challengeService.timeframe.map(hour => moment(hour).format('Do MMM YYYY'));
  }

  /**
   * récupère le nom des assets ayant des températures pour un système donné
   * @param system_id id du systeme
   * @returns noms des assets
   */
  getAssetNamesForSystem(system_id: string): string[] {
    return this.challengeService.getSystem(system_id).recursiveAssets
      .filter(asset => asset.data.some(assetData => assetData.name === "temperature"))
      .map(asset => asset.label)
  }

  /**
   * TODO: récupérer les valeurs des températures des assets
   * seul data[] doit être modifié
   * @param system_id id du systeme concerné
   * @returns Series pour le LineChart
   */
  getTemperaturesByAssetForSystem(system_id: string): LineSeriesOption[] {
    console.log(this.challengeService.getSystem(system_id).recursiveAssets)
    return this.challengeService.getSystem(system_id).recursiveAssets
      .filter(asset => asset.data.some(assetData => assetData.name === "temperature"))
      .map(asset => ({
        name: asset.label,
        type: 'line',
        data: [
        ]
      }));
  }

  /**
   * récupérer le nombre d'objets fabriqués par jour par machine
   * TODO: construire la map machineOutputData de telle sorte a ce qu'elle renvoie la somme des outputs par jour
   * @returns Series pour le LineChart
   */
  getSerieForMachine(machine: Asset): BarSeriesOption {
    const machineOutputData = new Map<string, number>();
    return {
      name: machine.label,
      type: 'bar',
      stack: 'total',
      label: {
        show: true
      },
      data: Array.from(machineOutputData.values())
    }
  }

  ngForTrackByFn(index, item) {
    return item.id;
  }
}
