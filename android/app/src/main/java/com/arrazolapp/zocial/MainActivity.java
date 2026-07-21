package com.arrazolapp.zocial;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.gokadzev.capacitormusiccontrols.CapacitorMusicControls;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CapacitorMusicControls.class);
        super.onCreate(savedInstanceState);
    }
}
