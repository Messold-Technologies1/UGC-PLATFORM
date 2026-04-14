"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRegisterAdminMutation } from "@/features/admin/hooks/use-register-admin-mutation";

export default function AdminSettings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const registerAdminMutation = useRegisterAdminMutation({
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
    },
  });

  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 16; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    registerAdminMutation.mutate({ name, email, password });
  };

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7 glass-card rounded-xl p-10 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
            <div className="relative z-10">
              <h2 className="font-headline text-3xl font-extrabold text-foreground mb-2 tracking-tight">
                Register New Admin
              </h2>
              <p className="text-muted-foreground mb-6 font-body">
                Grant administrative access to a new team member with specific
                permission scopes.
              </p>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full glass-input rounded-lg p-4 text-foreground placeholder:text-muted-foreground font-headline font-semibold bg-background/50"
                      placeholder="e.g. Alex Rivera"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full glass-input rounded-lg p-4 text-foreground placeholder:text-muted-foreground font-headline font-semibold bg-background/50"
                      placeholder="name@nocturne.admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">
                    Secure Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full glass-input rounded-lg p-4 pr-12 text-foreground font-mono tracking-widest bg-background/50"
                      placeholder="••••••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-1 pt-1">
                    <p className="text-[10px] text-muted-foreground font-bold">
                      STRENGTH:{" "}
                      <span className="text-primary uppercase">
                        {password.length > 10
                          ? "EXCEPTIONAL"
                          : password.length >= 8
                            ? "GOOD"
                            : "WEAK"}
                      </span>
                    </p>
                    <button
                      className="text-[10px] font-bold text-primary hover:text-secondary flex items-center gap-1 transition-all uppercase tracking-wider"
                      type="button"
                      onClick={generatePassword}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        refresh
                      </span>
                      Generate secure
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={registerAdminMutation.isPending}
                    className="w-full bg-primary py-2 px-4 rounded-xl font-headline text-primary-foreground font-semibold text-sm tracking-normal shadow-sm hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    {registerAdminMutation.isPending ? "Creating..." : "Create Admin Account"}
                    {!registerAdminMutation.isPending && (
                      <span className="material-symbols-outlined text-base">
                        person_add
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <div className="lg:col-span-5 space-y-8">
            <div className="glass-card rounded-xl p-8 border-primary/10 group">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    security
                  </span>
                </div>
                <h3 className="font-headline font-bold text-xl text-foreground">
                  Security Policy
                </h3>
              </div>
              <ul className="space-y-4 font-headline text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  <span>
                    Multi-factor authentication (MFA) is mandatory for all
                    administrative roles.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  <span>
                    Session timeouts occur after 15 minutes of inactivity.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  <span>
                    Logins restricted to approved corporate VPN IP ranges.
                  </span>
                </li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-8 border-white/5 relative overflow-hidden">
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-secondary/5 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">
                  PENDING INVITES
                </h4>
                <div className="flex items-end justify-between">
                  <span className="text-5xl font-headline font-black text-foreground">
                    12
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      EXPIRES IN
                    </p>
                    <p className="text-sm font-headline font-bold text-secondary">
                      48 Hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="glass-card rounded-xl overflow-hidden mt-12">
          <div className="px-8 py-6 border-b border-foreground/5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-foreground/2">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-headline font-extrabold text-2xl text-foreground tracking-tight">
                Active Administrative Team
              </h3>
              <p className="text-sm text-muted-foreground font-headline">
                Manage current curators and their access levels.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border">
                Export Logs
              </button>
              <button className="px-4 py-2 rounded-lg bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border">
                Audit History
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-headline">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-foreground/5">
                  <th className="px-8 py-5 font-bold">Team Member</th>
                  <th className="px-8 py-5 font-bold">Administrative Role</th>
                  <th className="px-8 py-5 font-bold">Access Level</th>
                  <th className="px-8 py-5 font-bold">Status</th>
                  <th className="px-8 py-5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/3">
                <tr className="group hover:bg-foreground/1.5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg border border-border overflow-hidden bg-background">
                        <Image
                          width={40}
                          height={40}
                          alt="Marcus Vane"
                          className="w-full h-full object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcSr-SzKGH3oc_xvXCnmBKoGdon4EHNTMmjElxuAOwpQ6mKUszH1kIXlrjiaxiZGGtGlwPndJnJov798tUsvrBA50IM1p0k_UL35Ej6FL5khZHbRLci5ETPmoOcS0mRncKVUUrPaiusJoYc_E7Nkao8PqTDP60E2Inaa7_noeD8FPfSuKDSndjImkSabEMJGYV_Gqaom9u_3BU2b1fpiMn0Vcj4Nsshxm-SjhdSWAHKMII6gEzHFEVf9lD3P4qQNPEabn5wUbvwl4"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          Marcus Vane
                        </p>
                        <p className="text-xs text-muted-foreground">
                          marcus.v@nocturne.admin
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-semibold text-foreground/90">
                      Super Admin
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        Root Authority
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 pulse-indicator text-green-500"></div>
                      <span className="text-xs font-bold text-foreground">
                        Active Now
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <span className="material-symbols-outlined">
                        more_vert
                      </span>
                    </button>
                  </td>
                </tr>

                <tr className="group hover:bg-foreground/1.5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg border border-border overflow-hidden bg-background">
                        <Image
                          width={40}
                          height={40}
                          alt="Elena Soros"
                          className="w-full h-full object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC03eB8C8iDvH4Lc8-cwZ1QKcB6Z8GHZzQgm7XeJKpCzNE3PpimSb6jhZRV4pTddHx5mg6iRPMFkKM0_3xLvIepqKiSITuGV6Av1-jdnHjC2yGYacn00xQqi4RGqxAhf660VKr-ReYJmK2EuuW31-TIUw8deYUE7UkaMhIUhDvrMDtI4xmUbkkwS4321SNxhAv925VVrH6UnDNhys-Pmo44xMNGfQgyPJrO4Wxs1TyMOTp7E1EXPNJGJcbxg12-Z9cOeXjK-chHXV8"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          Elena Soros
                        </p>
                        <p className="text-xs text-muted-foreground">
                          elena.audits@nocturne.admin
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-semibold text-foreground/90">
                      Lead Auditor
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(52,181,250,0.8)]"></div>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                        Financial Tier 2
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                      <span className="text-xs font-bold text-muted-foreground">
                        Idle 42m
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <span className="material-symbols-outlined">
                        more_vert
                      </span>
                    </button>
                  </td>
                </tr>

                <tr className="group hover:bg-foreground/1.5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg border border-border overflow-hidden bg-background">
                        <Image
                          width={40}
                          height={40}
                          alt="Kaelen Wright"
                          className="w-full h-full object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-HV6keQsG3U6S2Cv2xoOhqgR88FgXAw_O2poct_wXKJoGtuZniIqriGPajwz4ocgb3o9rg5VYAATP75RfBgoh5d0JFOIrWUgz1CsOl0wyyEDSPdXKE9iHm5UtFCuoPIovWGDOfqxP959dKgZ72yPeWtba1g5RSF0uiK3JNo-Y4MUqmhtL3V1aTbxJTWTDNP1Jdlc12jI9w1J0piPUKNQ3bD1th5ZaI5L054smv7IFYS0RaC3X0fyFXh4VHCusndN3C7asAihj4i8"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          Kaelen Wright
                        </p>
                        <p className="text-xs text-muted-foreground">
                          wright.k@nocturne.admin
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-semibold text-foreground/90">
                      Content Curator
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#ffb148] shadow-[0_0_8px_rgba(255,177,72,0.8)]"></div>
                      <span className="text-[10px] font-bold text-[#ffb148] uppercase tracking-widest">
                        UGC Moderate
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 pulse-indicator text-green-500"></div>
                      <span className="text-xs font-bold text-foreground">
                        Active Now
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <span className="material-symbols-outlined">
                        more_vert
                      </span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-8 py-5 bg-background/50 border-t border-foreground/5 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Showing 3 of 14 active administrators
            </p>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg bg-background text-muted-foreground cursor-not-allowed border border-border">
                <span className="material-symbols-outlined text-lg">
                  chevron_left
                </span>
              </button>
              <button className="p-2 rounded-lg bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border">
                <span className="material-symbols-outlined text-lg">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
      </section>
    </div>
  );
}
