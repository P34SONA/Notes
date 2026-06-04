import { Copy, Check, Users, Wifi, WifiOff, RefreshCw, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";

interface SyncIndicatorProps {
  status: "connected" | "connecting" | "error";
  activeDevicesCount: number;
  devicesList: string[];
  roomId: string;
  deviceName: string;
  onDeviceNameChange: (name: string) => void;
}

export default function SyncIndicator({
  status,
  activeDevicesCount,
  devicesList,
  roomId,
  deviceName,
  onDeviceNameChange,
}: SyncIndicatorProps) {
  const [copied, setCopied] = useState(false);
  const [tempDeviceName, setTempDeviceName] = useState(deviceName);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setTempDeviceName(deviceName);
  }, [deviceName]);

  const copyShareLink = async () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const saveDeviceName = () => {
    if (tempDeviceName.trim()) {
      onDeviceNameChange(tempDeviceName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div id="sync-control-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {status === "connected" && (
              <>
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <div className="absolute top-0 left-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </>
            )}
            {status === "connecting" && (
              <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
            )}
            {status === "error" && (
              <div className="w-3 h-3 bg-rose-500 rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5 leading-none">
              Live Cloud Sync
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {status === "connected" && "Fully Synchronized"}
              {status === "connecting" && "Restoring stream..."}
              {status === "error" && "Sync connection lost"}
            </span>
          </div>
        </div>

        <button
          id="btn-copy-link"
          onClick={copyShareLink}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied Link!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sync Phone/Device</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Left column: Current Device Alias editing */}
        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
          <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
            Your Device Label
          </label>
          {isEditingName ? (
            <div className="flex gap-2 items-center mt-1">
              <input
                id="input-device-name"
                type="text"
                value={tempDeviceName}
                maxLength={20}
                onChange={(e) => setTempDeviceName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveDeviceName()}
                className="w-full bg-white px-2.5 py-1 text-slate-700 rounded border border-slate-200 outline-none focus:border-indigo-400"
              />
              <button
                id="btn-save-device-name"
                onClick={saveDeviceName}
                className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-semibold hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center mt-1">
              <span className="font-mono text-slate-700 font-medium truncate py-0.5">
                {deviceName}
              </span>
              <button
                id="btn-edit-device-name"
                onClick={() => setIsEditingName(true)}
                className="text-indigo-600 hover:underline hover:text-indigo-800"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Right column: Presence details */}
        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
            <Users className="w-3 h-3 text-slate-400" />
            <span>Online Sync Stream ({activeDevicesCount})</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            {devicesList.length > 0 ? (
              devicesList.map((dev, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    dev === deviceName
                      ? "bg-indigo-50 border-indigo-100 text-indigo-700"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  <Smartphone className="w-2.5 h-2.5 opacity-60" />
                  {dev}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic">No sync devices tracked</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
