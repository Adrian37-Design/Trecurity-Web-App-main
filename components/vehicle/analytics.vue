<template>
    <main ref="analytics_container_el">
        <div class="row">
            <div class="col-12 d-flex justify-content-center mb-3">
                <SelectButton id="status" style="margin-right: 5px;" v-model="option" :options="['All', 'Fuel Level', 'Speed', 'Drive Time', 'Drive Mileage', 'Park Time', 'Operating Hours']" :allow-empty="false" aria-labelledby="basic" />
            </div>
            <div class="col-md-8">
                <form @submit.prevent="search" class="d-flex justify-content-center">
                    <Calendar v-model="date_from" placeholder="Date From" showTime hourFormat="24" dateFormat="d/m/yy" :input-props="{ 'required': true }" />
                    <Calendar v-model="date_to" class="ms-1" placeholder="Date To" showTime hourFormat="24" dateFormat="d/m/yy" :input-props="{ 'required': true }" />
                    <div>
                        <Button type="submit" class="ms-2" :class="{ 'p-button-secondary': !date_from || !date_to, 'p-button-info': date_from && date_to }" icon="ti ti-search" :loading="is_loading" rounded aria-label="Search" />
                    </div>
                </form>
            </div>
            <div v-if="date_from && date_to" class="col-md-4 mt-3 mt-sm-0 d-flex">
                <Dropdown v-model="export_option" :options="['Complete Data', 'Fuel Level', 'Speed', 'Mileage', 'Battery Percentage', 'Ignition Status']" placeholder="Select Data" class="me-2 flex-grow-1" />
                <Button @click="download" label="Export" icon="pi pi-download" :loading="is_exporting" class="flex-shrink-0" :class="{ 'p-button-secondary': !date_from || !date_to, 'p-button-info': date_from && date_to }" />
            </div>
            <div class="col-12">
                <canvas style="height: 500px;" ref="el" class="mt-2"></canvas>
            </div>
            <div class="col-12">
                <Button class="float-end" label="Reset Zoom" @click="chart?.resetZoom()" size="small" />
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
    import Chart from "chart.js/auto";
    import zoomPlugin from 'chartjs-plugin-zoom';
    import moment from "moment";
    import { type User, type Company, type Vehicle, type Geofence, type TrackingData } from '@prisma/client';
    import { useToast } from 'primevue/usetoast';
    import { useElementVisibility } from "@vueuse/core";

    Chart.register(zoomPlugin);

    const props = defineProps<{
        vehicle?: Vehicle & { company: Company, user: User[], tracking_data: TrackingData[], geofence?: Geofence }
    }>()

    const toast = useToast()

    const { user } = useUser();
    const token = useCookie('token')

    let chart: Chart;
    let el = ref<any>();
    const option = ref<'All' | 'Fuel Level' | 'Speed' | 'Drive Time' | 'Drive Mileage' | 'Park Time' | 'Operating Hours'>('All')
    const export_option = ref<string>('Complete Data')
    const date_from = ref<Date>()
    const date_to = ref<Date>()
    const chart_data = ref<any>([])
    const analytics_container_el = ref<HTMLElement>()
    const is_analytics_container_el_visible = useElementVisibility(analytics_container_el)
    const is_exporting = ref<boolean>(false)
    const is_loading = ref<boolean>(false)

    const search = async () => {

        is_loading.value = true;

        try {

            const vehicleId = props?.vehicle?.id;

            const result = await $fetch<{ data: any }>(`/api/vehicle/${vehicleId}/analytics`, {
                query: {
                    date_from: date_from.value.toISOString(),
                    date_to: date_to.value.toISOString(),
                }
            });
            
            chart_data.value = result.data
            createChart()
           
        } catch (err) {
            toast.add({ severity: 'warn', summary: "Error", detail: err.message });
        } finally {
            is_loading.value = false;
        }
    } 

    const getLabels = () => chart_data.value.map(({ interval_group }) => moment(new Date(interval_group)).format('DD MMM yy, h:mmA'))

    const interpolateData = (data: (number | null)[]) => {
        // 1. Identify indices of all valid numbers
        let indices: number[] = [];
        data.forEach((val, index) => {
            if (val !== null && val !== undefined && !isNaN(Number(val))) {
                indices.push(index);
            }
        });

        if (indices.length === 0) return data; // No data at all

        let filledData = [...data];

        // 2. Linear Interpolation for Internal Gaps
        for (let i = 0; i < indices.length - 1; i++) {
            let startIdx = indices[i];
            let endIdx = indices[i + 1];
            
            // If adjacent, skip
            if (endIdx - startIdx === 1) continue;

            let startVal = Number(data[startIdx]);
            let endVal = Number(data[endIdx]);
            let steps = endIdx - startIdx;
            let stepSize = (endVal - startVal) / steps;

            for (let j = 1; j < steps; j++) {
                filledData[startIdx + j] = startVal + (stepSize * j);
            }
        }

        return filledData;
    }

    const getDataSets = () => {
        const fuel_level = {
            label: 'Avg. Fuel Level',
            data: interpolateData(chart_data.value.map(({ data }) => data?.fuel_level != null ? Number(data.fuel_level) : null)),
            fill: option.value === 'Fuel Level',
            tension: 0,
            spanGaps: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)', // Blue
            borderColor: 'rgb(54, 162, 235)', // Blue
            borderWidth: 2,
            pointRadius: 1,
            pointBackgroundColor: 'rgb(54, 162, 235)',
            showLine: true
        }

        const speed = {
            label: 'Avg. Speed',
            data: interpolateData(chart_data.value.map(({ data }) => data?.speed != null ? Number(data.speed) : null)),
            fill: option.value === 'Speed',
            tension: 0,
            spanGaps: true,
            backgroundColor: 'rgba(255, 159, 64, 0.2)', // Orange
            borderColor: 'rgb(255, 159, 64)', // Orange
            borderWidth: 2,
            pointRadius: 1,
            pointBackgroundColor: 'rgb(255, 159, 64)',
            showLine: true
        }

        const drive_time = {
            label: 'Drive Time',
            data: interpolateData(chart_data.value.map(({ data }) => data?.drive_time != null ? Number(data.drive_time) : null)),
            fill: option.value === 'Drive Time', 
            tension: 0,
            spanGaps: true,
            backgroundColor: 'rgba(255, 99, 132, 0.2)', // Red
            borderColor: 'rgb(255, 99, 132)', // Red
            borderWidth: 2,
            pointRadius: 1,
            pointBackgroundColor: 'rgb(255, 99, 132)',
            showLine: true,
            yAxisID: 'y1'
        }

        const drive_mileage = {
            label: 'Avg. Drive Mileage',
            data: interpolateData(chart_data.value.map(({ data }) => data?.drive_mileage != null ? Number(data.drive_mileage) : null)),
            fill: option.value === 'Drive Mileage',
            tension: 0,
            spanGaps: true,
            backgroundColor: 'rgba(75, 192, 192, 0.2)', // Green
            borderColor: 'rgb(75, 192, 192)', // Green
            borderWidth: 2,
            pointRadius: 1,
            pointBackgroundColor: 'rgb(75, 192, 192)',
            showLine: true
        }

        const park_time = {
            label: 'Park Time',
            data: interpolateData(chart_data.value.map(({ data }) => data?.park_time != null ? Number(data.park_time) : null)),
            fill: option.value === 'Park Time',
            tension: 0,
            spanGaps: true,
            backgroundColor: 'rgba(155, 81, 224, 0.2)', // Purple
            borderColor: 'rgb(155, 81, 224)', // Purple
            borderWidth: 2,
            pointRadius: 1,
            pointBackgroundColor: 'rgb(155, 81, 224)',
            showLine: true,
            yAxisID: 'y1'
        }

        const operating_hours = {
            label: 'Operating Hours',
            data: interpolateData(chart_data.value.map(({ data }) => data?.operating_hours != null ? Number(data.operating_hours) : null)),
            fill: option.value === 'Operating Hours',
            tension: 0,
            spanGaps: true,
            backgroundColor: 'rgba(255, 206, 86, 0.2)', // Yellow
            borderColor: 'rgb(255, 206, 86)', // Yellow
            borderWidth: 2,
            pointRadius: 1,
            pointBackgroundColor: 'rgb(255, 206, 86)',
            showLine: true,
            yAxisID: 'y1'
        }

        if(option.value === 'All') return  [ fuel_level, speed, drive_time, drive_mileage, park_time, operating_hours ]
        else if(option.value === 'Fuel Level') return [ fuel_level ]
        else if(option.value === 'Speed') return [ speed ]
        else if(option.value === 'Drive Mileage') return [ drive_mileage ]
        else if(option.value === 'Drive Time') return [ drive_time ]
        else if(option.value === 'Park Time') return [ park_time ]
        else return [ operating_hours ]
    }

    const getSIUnit = (value: string, option: string) => {
        if(option === 'Avg. Fuel Level') return `${ value }L`
        else if(option === 'Avg. Speed') return `${ value }km/h`
        else if(option === 'Drive Time') return `${ value }h`
        else if(option === 'Avg. Drive Mileage') return `${ value }km`
        else if(option === 'Park Time') return `${ value }h`
        else if(option === 'Operating Hours') return `${ value }h`
        else return "No Data"
    }

    const createChart = () => {
        if(chart) {
            // Update chart with new data
            chart.data = {
                labels: getLabels(),
                datasets: getDataSets()
            }

            chart.update()
            chart?.resetZoom()
        } else {
            // Create chart
            chart = new Chart(el.value, {
                type: 'line',
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: (item) => {
                                    return " " + item.dataset.label + ": " + `${ getSIUnit(item.formattedValue, item.dataset.label) }`
                                }
                            }
                        },
                        zoom: {
                            pan: {
                                enabled: true
                            },
                            zoom: {
                                wheel: {
                                    enabled: true,
                                    speed: 0.01
                                },
                                pinch: {
                                    enabled: true
                                },
                                mode: 'xy'
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                align: 'center',
                                text: "Time"
                            },
                            ticks: {
                                source: 'auto'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                align: 'center',
                                text:  'Amount'
                            },
                            ticks: {
                                callback: (value) => {
                                    return Number(value).toFixed()
                                }
                            },
                            suggestedMin: 0
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                align: 'center',
                                text: 'Time (Hours)'
                            },
                            grid: {
                                drawOnChartArea: false, // only want the grid lines for one axis
                            },
                            suggestedMin: 0
                        }
                    },
                    transitions: {
                        zoom: {
                            animation: {
                                duration: 1000,
                                easing: 'easeOutCubic'
                            }
                        }
                    }
                },
                data: {
                    labels: getLabels(),
                    datasets: getDataSets()
                }
            });
        }
    }
    
    watch(is_analytics_container_el_visible, async () => {
        date_from.value = moment().subtract(1, 'd').toDate()
        date_to.value = new Date()
        await search()
    }, {
        once: true
    })

    watch(option, () => {
        // Update chart with new data
        chart.data = {
            labels: getLabels(),
            datasets: getDataSets()
        }

        chart.update()
    })

    const download = async () => {
        is_exporting.value = true;
        const result: any = await $fetch('/api/analytics/export', {
            method: 'POST',
            responseType: 'blob',
            body: JSON.stringify({
                vehicle_id: props?.vehicle?.id,
                date_from: date_from.value,
                date_to: date_to.value,
                user_id: user.value.id,
                token: token.value,
                export_option: export_option.value
            })
        });

        //Open the pdf in another tab
        const blob = new Blob([result], { type: 'application/xlsx' });
        
        // Usage
        downloadBlob(blob, `Tracking Data (#${ props?.vehicle?.number_plate }).xlsx`);

        is_exporting.value = false;
    }

    const downloadBlob = (blob, name) => {
        // @ts-ignore
        if (window.navigator && window.navigator.msSaveOrOpenBlob) return window.navigator.msSaveOrOpenBlob(blob);

        // For other browsers:
        // Create a link pointing to the ObjectURL containing the blob.
        const data = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = data;
        link.download = name;

        // this is necessary as link.click() does not work on the latest firefox
        link.dispatchEvent(
            new MouseEvent('click', { 
                bubbles: true, 
                cancelable: true, 
                view: window 
            })
        );

        setTimeout(() => {
            // For Firefox it is necessary to delay revoking the ObjectURL
            window.URL.revokeObjectURL(data);
            link.remove();
        }, 100);
    }
</script>