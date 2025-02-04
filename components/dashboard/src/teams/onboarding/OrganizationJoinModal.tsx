/**
 * Copyright (c) 2025 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { Button } from "@podkit/buttons/Button";
import { ModalHeader } from "../../components/Modal";
import { ModalBody } from "../../components/Modal";
import { ModalFooter } from "../../components/Modal";
import { Modal } from "../../components/Modal";
import { useMemo, useCallback, useState, useEffect } from "react";
import { storageAvailable } from "../../utils";
import { OrganizationSettings } from "@gitpod/public-api/lib/gitpod/v1/organization_pb";
import { WelcomeMessagePreview } from "./WelcomeMessagePreview";

type Props = {
    orgSettings: OrganizationSettings;
};
export const OrganizationJoinModal = ({ orgSettings }: Props) => {
    const initialOrgOnboardingPending = useMemo(() => {
        if (storageAvailable("localStorage")) {
            return localStorage.getItem("newUserOnboardingPending") === "true";
        }
    }, []);
    const dismissOrgOnboardingPending = useCallback(() => {
        if (storageAvailable("localStorage")) {
            localStorage.removeItem("newUserOnboardingPending");
        }

        setOrgOnboardingPending(false);
    }, []);
    const [orgOnboardingPending, setOrgOnboardingPending] = useState(initialOrgOnboardingPending ?? false);

    // if the org-wide welcome message is not enabled, prevent showing it in the future
    useEffect(() => {
        if (!orgSettings?.onboardingSettings?.welcomeMessage?.enabled) {
            dismissOrgOnboardingPending();
        }
    }, [orgSettings?.onboardingSettings?.welcomeMessage?.enabled, dismissOrgOnboardingPending]);

    if (!orgSettings?.onboardingSettings?.welcomeMessage?.enabled) {
        return null;
    }

    return (
        <Modal
            visible={orgOnboardingPending}
            onClose={dismissOrgOnboardingPending}
            containerClassName="min-[576px]:max-w-[650px]"
        >
            <ModalHeader>Welcome to Gitpod</ModalHeader>
            <ModalBody>
                <WelcomeMessagePreview hideHeader />
            </ModalBody>
            <ModalFooter>
                <Button onClick={dismissOrgOnboardingPending}>Get Started</Button>
            </ModalFooter>
        </Modal>
    );
};
