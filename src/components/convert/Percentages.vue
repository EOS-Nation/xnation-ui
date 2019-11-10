<template>
    <div>
        <span class="text-white font-size-sm" style="min-height: 50px">
            <div>
                Available:
                <span v-if="loading">
                    <font-awesome-icon icon="circle-notch" class="text-white" spin />
                </span>
                <span v-else>{{ formattedBalance }}</span>
            </div>
            <div v-if="balance > 0" class="text-white-50 cursor">
                <span @click="setPercentage(10)">10%</span>
                -
                <span @click="setPercentage(25)">25%</span>
                -
                <span @click="setPercentage(50)">50%</span>
                -
                <span @click="setPercentage(100)">100%</span>
            </div>
        </span>
    </div>
</template>

<script lang="ts">
import { Prop, Watch, Component, Vue } from "vue-property-decorator";
import { vxm } from "@/store";
import debounce from "lodash.debounce";
import numeral from "numeral";
import { TokenInfo } from "@/assets/_ts/bancorx";
import * as bancorx from "@/assets/_ts/bancorx";

@Component({
    components: {}
})
export default class TokenAmountInput extends Vue {
    // props
    @Prop(String) balance!: string;
    @Prop(Boolean) loading: boolean = false;
    @Prop(String) amount!: string;

    // data
    numeral = numeral;

    // computed
    get formattedBalance() {
        return numeral(this.balance).format('0,0[.][0000]')
    }

    // method
    setPercentage(percentage: number) {
        const numberAmount = Number(this.balance) * (percentage / 100);
        this.$emit("update:amount", String(numberAmount));
    }

    // Lifecycle hooks
    async created() { }
    mounted() { }
    updated() { }
    destroyed() { }
}
</script>

<style lang="scss" scoped>

</style>
